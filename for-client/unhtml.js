html.html({lang: "en"}, [
    html.head([
        html.title("diccionarios y clasificadores"),
        html.link({href: "css/dialog-promise.css", rel: "stylesheet"}),
        html.link({href: "css/my-things.css", rel: "stylesheet"}),
        html.link({href: "css/my-tables.css", rel: "stylesheet"}),
        html.link({href: "css/menu.css", rel: "stylesheet"}),
        html.link({href: "img/logo-128.png", rel: "shortcut icon", type: "image/png"}),
        html.link({href: "img/logo.png", rel: "apple-touch-icon"}),
    ]),
    html.body([
        html.div({id: "barra_superior"}, [
            html.img({id: "main-logo", src: "img/logo.png"}),
            html.input({
                id: "group-diccionarios",
                "class": "group",
                name: "radio-menu",
                type: "radio",
                value: "diccionarios",
            }),
            html.label({"class": "group", "for": "group-diccionarios", "id-grupo": "diccionarios"}, "diccionarios"),
            html.input({
                id: "group-clasificadores",
                "class": "group",
                name: "radio-menu",
                type: "radio",
                value: "clasificadores",
            }),
            html.label({"class": "group", "for": "group-clasificadores", "id-grupo": "clasificadores"}, "clasificadores"),
            html.input({
                id: "group-orígenes",
                "class": "group",
                name: "radio-menu",
                type: "radio",
                value: "orígenes",
            }),
            html.label({"class": "group", "for": "group-orígenes", "id-grupo": "orígenes"}, "orígenes"),
            html.input({
                id: "group-configuración",
                "class": "group",
                name: "radio-menu",
                type: "radio",
                value: "configuración",
            }),
            html.label({"class": "group", "for": "group-configuración", "id-grupo": "configuración"}, "configuración"),
            html.span({id: "menu-derecha"}, [
                html.span({id: "active-user"}, "user"),
                html.img({id: "menu-derecha", src: "img/three-dot-menu.png"}),
            ]),
            html.div({"class": "barra_intermedia", "id-grupo": "diccionarios"}, [
                html.span({"class": "group", style: "display:none;"}, "diccionarios: "),
                html.button({"class": "tables", "id-table": "diccionarios"}, "     diccionarios"),
                html.button({"class": "tables", "id-table": "dic_ent"}, "          entradas"),
            ]),
            html.div({"class": "barra_intermedia", "id-grupo": "clasificadores"}, [
                html.span({"class": "group", style: "display:none;"}, "clasificadores: "),
                html.button({"class": "tables", "id-table": "clasificadores"}, "   clasificadores"),
                html.button({"class": "tables", "id-table": "cla_item"}, "         ítems"),
            ]),
            html.div({"class": "barra_intermedia", "id-grupo": "orígenes"}, [
                html.span({"class": "group", style: "display:none;"}, "orígenes: "),
                html.button({"class": "tables", "id-table": "origenes"}, "        origenes"),
            ]),
            html.div({"class": "barra_intermedia", "id-grupo": "configuración"}, [
                html.span({"class": "group", style: "display:none;"}, "configuración: "),
                html.button({"class": "tables", "id-table": "usuarios"}, "        usuarios      "),
            ]),
        ]),
        html.div({id: "main_layout"}, [
            html.div({id: "table_layout"}),
        ]),
        html.pre({id: "status"}),
        html.script({src: "lib/js-yaml.js"}),
        html.script({src: "lib/xlsx.core.min.js"}),
        html.script({src: "lib/require-bro.js"}),
        html.script({src: "lib/like-ar.js"}),
        html.script({src: "lib/best-globals.js"}),
        html.script({src: "lib/json4all.js"}),
        html.script({src: "lib/postgres-interval4client.js"}),
        html.script({src: "lib/dialog-promise.js"}),
        html.script({src: "lib/js-to-html.js"}),
        html.script({src: "pikaday/pikaday.js"}),
        html.script({src: "lib/big.js"}),
        html.script({src: "lib/type-store.js"}),
        html.script({src: "lib/typed-controls.js"}),
        html.script({src: "lib/ajax-best-promise.js"}),
        html.script({src: "my-things.js"}),
        html.script({src: "my-skin.js"}),
        html.script({src: "my-tables.js"}),
        html.script({src: "my-inform-net-status.js"}),
        html.script({src: "lib/cliente-en-castellano.js"}, " "),
        html.script({src: "menu.js"}),
    ]),
]),
