const Kr = require('../kram.js')

module.exports = function (pkg, front, code) {
  const module = `Kram_${pkg}`
  const imports = Kr.getImportSpecs(front.imports)
  const shape = Kr.getShapeOf(front.model)
  const chunks = code //.filter( t => t.lang === 'jsx')

  return `// module ${module}
import React from 'react'
import ReactDOM from 'react-dom'
const Redux = require('redux')
import Im from 'immutable'
import { Provider, connect } from 'react-redux'
${ imports.map( genImport ).join("\n") }

const View = (${genProps( shape )}) =>
  (<ul>
      ${ chunks.map( genViewChunk ).join("\n") }
  </ul>)

const mapStateToProps = state =>
  ( ${ genExposeModel( shape ) } )

const Component = connect(mapStateToProps)(View)

const Program = ({ model }) =>
  (<Provider store={model}>
    <Component />
  </Provider>)

function mount (mountpoint, initial) {

  const init = Im.Map(initial)
  const model = Redux.createStore(update)

  ReactDOM.render(
    React.createElement(Program, { model } ),
    mountpoint
  )

  function update (state = init, action = {}) {
      let value = state.get('value')
      switch (action.type) {
          case 'Increment':
              console.log('increment', state)
              return state.set('value', value + 1)
          case 'Decrement':
              console.log('decrement', state)
              return state.set('value', value - 1)
          default:
              return state
      }
  }
}

module.exports = mount
`
}

function genImport( spec ) {
  return `import ${spec.as} from '${spec.from}'`
}

function genProps( shape ) {
  const record = Kr.recordType( shape )
  if ( record )
    return `{ ${ Object.keys(record).join(", ") } }`

  return ''
}

function genExposeModel( shape ) {
  const record = Kr.recordType( shape )
  const expose = k => `${k}: state.get('${k}')`

  if ( record )
    return (`{
      ${ Object.keys(record).map(expose).join(", ") }
    }`)

  return '{}'
}

function genViewChunk( chunk ) {
  return (`
     <li key="${chunk.id}" id="${chunk.id}">
       ${chunk.text.split("\n").join("\n        ")}
     </li>
  `)
}
