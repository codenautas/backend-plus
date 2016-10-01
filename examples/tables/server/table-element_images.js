"use strict";

module.exports = function(context){
    return context.be.tableDefAdapt({
        name:'element_images',
        title:'images for elements and isotopes',
        editable:context.user.rol==='boss',
        fields:[
            {name:'atomic_number'       , typeName:'integer', nullable:false,                },
            {name:'kind'                , typeName:'text'                                    },
            {name:'mass_number'         , typeName:'integer', nullable:false, default:0      },
            {name:'url'                 , typeName:'text'                                    },
        ],
        primaryKey:['atomic_number','mass_number','kind'],
        actionNamesList:['showImg'],
        allow:{showImg:true},
    });
}
