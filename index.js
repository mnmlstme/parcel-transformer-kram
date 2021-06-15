const path = require('path')
const { Transformer } = require('@parcel/plugin')
const Kr = require('kram')

module.exports = new Transformer ({

  async parse ({asset, config, logger, resolve, options}) {
    const { filePath, meta } = asset

    logger.info({
      message: `Kram: extracting code from ${filePath}`,
      filePath,
      language: meta.lang
    })

    const code = await asset.getCode()
    return Kr.parse( code )
  },

  async transform({ asset, config, logger, resolve, options }) {

    const { id, filePath, meta, type, query } = asset
    const kramDir = path.dirname(filePath)
    const kramFile = path.basename(filePath)
    const pkg = path.basename(filePath, '.kr')
    const { front, doc } = await asset.getAST()
    const { platform, model } = front

     logger.info({
       message: `Kram: ${id}\nfrom ${filePath} query=${JSON.stringify(query)} meta=${JSON.stringify(meta)}`,
       filePath,
       language: meta.lang
     })

    if ( query && query.kram && query.lang ) {
      const lang = query.lang
      const generated = Kr.collate(pkg, front, doc, lang)

      asset.type = lang
      asset.setCode(generated)
      //asset.uniqueKey = `${platform}-${lang}`

      logger.info({
        message: `Kram: generated asset:\n${generated}`,
        filePath,
        language: lang
      })
    } else {
      // Generate doc asset with dependences
      const dependences = Kr.getLanguages( doc )
        .map( lang => {
            logger.info({
                message: `Kram: generated dependence:\n${JSON.stringify(lang)}`,
                filePath,
                language: lang
            })

          const dependency = {
             moduleSpecifier:
                //`kram:./${pkg}.${platform}.${lang}?kram=${kramFile}&lang=${lang}`,
                `${filePath}?kram=${kramFile}&platform=${platform}&lang=${lang}`,
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
        html: Kr.html(doc),
        modules: Object.fromEntries(
            dependences.map(
                d => [d.meta.lang, d.moduleSpecifier]
            ))
      })

      const bindFn = Kr.bind(dependences[0].moduleSpecifier, platform)

      asset.type = 'js'
      asset.setCode(`
          const Kram = require('kram')
          module.exports = Object.assign(${json}, {
            bind: ${bindFn}
          })
              `
      )
    }

    return [ asset ]
  },

})
