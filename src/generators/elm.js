const Kr = require('../kram.js')

module.exports = function (pkg, front, code) {
  const module = `Kram_${pkg}`
  const imports = Kr.getImportSpecs(front.imports)
  const shape = Kr.getShapeOf(front.model)
  const chunks = code.filter( t => t.lang === 'elm')

  return `port module ${module} exposing (main)
import Browser
import Html
import Html.Attributes as Attr
import Json.Decode as Json
${ imports.map( genImport ).join("\n") }

main : Program () Model Msg
main =
  Browser.element
    { init = init
    , view = view
    , update = update
    , subscriptions = subscriptions
    }

port kram_input : (String -> msg) -> Sub Msg

type alias Model =
  ${ genModel( shape ) }

init : String -> ( Model, Cmd msg )
init json =
  ( Json.decode decoder json, Cmd.none )

type Msg
  = Incoming String

update : Msg -> Model -> ( Model, Cmd msg )
update msg model =
  case msg of
    Incoming x ->
      ( { model | html = x }, Cmd.none )

decoder : Json.Decoder Model
decoder =
  ${ genDecoder( shape ) }

subscriptions : Model -> Sub Msg
subscriptions model =
  kram_input Incoming

view : Model -> Html Msg
view model =
  ${ genExposeModel( shape ) }
  Html.ul []
    [ ${ chunks.map( genView ).join("\n    , ") }
    ]
`
}

function genImport( spec ) {
  return `import ${spec.from} as ${spec.as}`
}

const typemap = {
  string: 'String',
  int: 'Int',
  float: 'Float',
  boolean: 'Boolean'
}

function genModel( shape ) {
  const field = (k, sh) => `${k}: ${genModel(sh)}`

  let t = Kr.arrayType( shape )
  if ( t )
    return `(List ${genModel(t)})`

  t = Kr.recordType( shape )
  if ( t )
      return `{ ${ Object.entries( t )
        .map( ([k, sh]) => field(k, sh) )
        .join("\n  ,")
      }
  }`

  return typemap[ Kr.scalarType( shape ) ] || 't'
}

const decodermap = {
  string: 'string',
  int: 'int',
  float: 'float',
  boolean: 'bool'
}

function genDecoder( shape ) {
  const field = (k, sh) => `(field "${k}" <| ${genDecoder(sh)})`

  let t = Kr.arrayType( shape )
  if ( t )
    return `Json.list <| ${genDecoder(t)}`

  t = Kr.recordType( shape )
  if ( t ) {
    const n = Object.keys(t).length
    return `Json.map${n} Model
    ${ Object.entries( t )
        .map( ([k, sh]) => field(k,sh) )
        .join("\n    ")
    }`
  }

  return decodermap[ Kr.scalarType( shape ) ] || 't'
}

function genExposeModel( shape ) {
  const record = Kr.recordType( shape )
  const expose = k => `${k} = model.${k}`

  if ( record )
    return ( `let
    ${ Object.keys(record).map(expose).join("\n    ") }
  in`)

  return ''
}

function genView( chunk ) {
  return `li [Attr.id ${chunk.id}]
      [ ${chunk.text.split("\n").join("\n        ")}
      ]`
}
