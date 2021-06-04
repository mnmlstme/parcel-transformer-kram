const { Transformer } = require('@parcel/plugin')
const path = require('path')
const marked = require('marked')
const frontMatter = require('front-matter')

module.exports = new Transformer ({

  async parse ({asset, config, logger, resolve, options}) {
    const { filePath, meta } = asset

    logger.info({
      message: `Kram: extracting code from ${filePath}`,
      filePath,
      language: meta.lang
    })

    const code = asset.getCode()
    const { body, attributes } = frontMatter(await code)
    const { platform } = attributes
    const defaultLang = platform.replace(/-.*$/, '')

    const doc = marked.lexer(body).map( function (token, index) {
      if ( token.type === "code" ) {
        const assign = {
          id: `krumb-${index}`,
          lang: token.lang || defaultLang
        }
        return Object.assign(token, assign)
      } else {
        return token
      }
    })

    return { front: attributes, doc }
  },

  async transform({ asset, config, logger, resolve, options }) {

    const { id, filePath, meta, type, query } = asset
    const kramDir = path.dirname(filePath)
    const kramFile = path.basename(filePath)
    const pkg = path.basename(filePath, '.kr')
    const { front, doc } = await asset.getAST()
    const { platform, model } = front

    const code = doc.filter( t => t.type === "code")

     logger.info({
       message: `Kram: transforming ${filePath} query=${JSON.stringify(query)} meta=${JSON.stringify(meta)}`,
       filePath,
       language: meta.lang
     })

    if ( query && query.kram && query.lang ) {
      // Generate code asset

      // TODO: plugins for other platforms
      const lang = query.lang
      const generator = require(`./src/generators/${platform}.js`)
      const generated = generator(pkg, front, code, lang)
      const codeFile = path.resolve(
        kramDir,
        `./kram-${platform}/${pkg}.${lang}`
      )

      asset.type = lang
      asset.setCode(generated)
      asset.uniqueKey = `${platform}-${lang}`

    } else {
      // Generate doc asset with dependences

      const dependences = code.map( t => t.lang )
        .reduce(
          (accum, next) => accum.includes(next) ?
            accum : accum.concat([next]),
          []
         )
        .map( lang => {
          const dependency = {
             moduleSpecifier:
                `./${pkg}.${lang}?kram=${kramFile}&lang=${lang}`,
             resolveFrom: filePath,
             meta: { platform, lang },
             loc: {
                filePath,
                start: { line: 1, column: 1 },
                end: { line: 1, column: 1 }
              }
            }

           asset.addDependency(dependency)
           return dependency
        })

      const json = JSON.stringify({
        platform,
        model,
        doc,
        html: marked.parser(doc),
        modules: Object.fromEntries(
          dependences.map( d => [d.meta.lang, d.moduleSpecifier]))
      }).replace(/}$/,
        `,"mount": function(node, initial){
          let mountfn = require('${dependences[0].moduleSpecifier}');
          mountfn(node, initial)
         }}`
      )

      asset.type = 'js'
      asset.setCode(`module.exports = ${json}`)
    }

    return [ asset ]
  },

})
