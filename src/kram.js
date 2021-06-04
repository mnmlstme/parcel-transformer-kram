
function getImportSpecs( imports ) {
  switch( getTypeOf(imports) ) {
    case 'array':
      return imports.map( importSpec )
    case 'record':
      return Object.entries( imports || {} )
        .map( ([k, v]) => importSpec(k, v) )
    case 'string':
      return [importSpec(imports)]
    default:
      return []
  }
}

function importSpec( pkg, spec ) {
  switch( getTypeOf(spec) ) {
    case 'record':
      return Object.assign( spec, { as: pkg } )
    case 'string':
      return { from: spec, as: pkg }
    default:
      return { from: pkg, as: pkg }
  }
}


function getShapeOf( model ) {
  const type = getTypeOf(model)

  switch( type ) {
    case 'array':
      return { [type]: getShapeOf(model[1]) }
    case 'record':
      fields = Object.entries(model)
        .map( ([k, v]) => [k, getShapeOf(v)] )
      return { [type]: Object.fromEntries(fields) }
    default:
      return type
  }
}

function getTypeOf( value ) {
  const type = typeof value

  switch ( type ) {
    case 'object':
      return Array.isArray( value ) ? 'array' : 'record'
    case 'number':
      return Number.isInteger( value ) ? 'int' : 'float'
    default:
      return type
  }
}

module.exports = {
  getImportSpecs,
  getShapeOf,
  getTypeOf,
  scalarType: sh => typeof sh === 'string' && sh,
  arrayType: sh => typeof sh === 'object' && sh['array'] || false,
  recordType: sh => typeof sh === 'object' && sh['record'] || false
}
