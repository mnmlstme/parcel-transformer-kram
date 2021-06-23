const path = require('path')
const { Transformer } = require('@parcel/plugin')
const Kr = require('kram')

module.exports = new Transformer ({

  async parse ({asset, config, logger, resolve, options}) {
    const { filePath, meta } = asset

    logger.info({
      message: `Kram: parsing kram file ${filePath}`,
      filePath,
      language: meta.lang
    })

    const content = await asset.getCode()
    return Kr.parse( content )
  },

  async transform({ asset, config, logger, resolve, options }) {

    const { id, filePath, meta, type, query } = asset
    const kramDir = path.dirname(filePath)
    const kramFile = path.basename(filePath)
    const pkg = path.basename(filePath, '.kr')

    logger.info({
       message: `Kram: transforming ${filePath}`,
       filePath,
       language: meta.lang
     })

    const { front, doc } = await asset.getAST()
    const { platform, model } = front
    const konfig = Kr.config(front, pkg)

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
                `./${platform}/${pkg}.${lang}`,
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

      const bindFn = konfig.bind(dependences[0].moduleSpecifier)

      asset.type = 'js'
      asset.setCode(`
          const Kram = require('kram')
          module.exports = Object.assign(${json}, {
            bind: ${bindFn}
          })
              `
      )

    return [ asset ]
  },

})
