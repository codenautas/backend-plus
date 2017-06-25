[{
    action: 'table/data',
    parameters: {table: 'employees', fixedFields:[]},
    expected: [
        {id_type: 'card',id: 123456,first_name: 'Bob' ,last_name: 'Smith',birth_date: null,salary: null },
        {id_type: "card",id: 654213,first_name: "Mary",last_name: "Gomez",birth_date: null,salary: null },
    ]
},{
    action: 'table/save-record',
    parameters: {
        table: 'employees',
        primaryKeyValues: ['card',123456],
        newRow: {id_type: 'passport'},
        oldRow: {id_type: 'card'},
        status: 'retrieved'
    },
    expected: {
        command: 'UPDATE', 
        row: {id_type: 'passport',id: 123456,first_name: 'Bob' ,last_name: 'Smith',birth_date: null ,salary: null },
    }
},{
    skip: !true,
    name: 'update dates',
    action: 'table/save-record',
    parameters: {
        table: 'employees',
        primaryKeyValues: ['passport',123456],
        newRow: {birth_date: new Date(1990,1-1,8)},
        oldRow: {birth_date: null},
        status: 'retrieved'
    },
    expected: {
        command: 'UPDATE', 
        row: {id_type: 'passport',id: 123456,first_name: 'Bob' ,last_name: 'Smith',birth_date: new Date(1990,1-1,8),salary: null },
    }
},{
    skip: '#25',
    // name: 'double update',
    action: 'double-update-employees',
    parameters: {
        value: 5,
    },
    expectedError: /algo/,
},{
    action: 'table/save-record',
    parameters: {
        table: 'conjson',
        primaryKeyValues: [1, {uno:'dos', tres:'cuatro'}],
        newRow: {data: '1,2,3,4'},
        oldRow: {data: '1 2 3 4'},
        status: 'retrieved'
    },
    expected: {
        command: 'UPDATE', 
        row: {idn:1, idj:{uno:'dos', tres:'cuatro'}, data: '1,2,3,4'},
    }
}]