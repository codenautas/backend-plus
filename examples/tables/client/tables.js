/*
class TableGrid{
    constructor(tableName){
        this.tableName = tableName;
    }
    grabIntoLayout(layout){
        var tableName = this.textContent;
        layout.textContent = 'loading...';
        var structureRequest = AjaxBestPromise.post({
            url:'table/structure',
            data:{
                table:tableName
            }
        }).then(function(result){
            return result;
        }).then(JSON.parse).then(function(tableDef){
            console.log(tableDef);
            var tableElement = html.table({"class":"tedede-grid"},[
                html.caption(tableDef.title),
                html.thead([html.tr(
                    tableDef.fields.map(function(fieldDef){
                        return html.th(fieldDef.title);
                    })
                )]),
                html.tbody()
            ]).create();
            layout.innerHTML='';
            layout.appendChild(tableElement);
            return {element: tableElement, def: tableDef};
        });
        AjaxBestPromise.post({
            url:'table/data',
            data:{
                table:tableName
            }
        }).then(JSON.parse).then(function(rows){
            return structureRequest.then(function(table){
                my.adaptData(table.def,rows);
                var tbody = table.element.tBodies[0];
                rows.forEach(function(row){
                    var tr = tbody.insertRow(-1);
                    table.def.fields.forEach(function(fieldDef){
                        var td = html.td().create();
                        Tedede.adaptElement(td, fieldDef);
                        td.setTypedValue(row[fieldDef.name]);
                        td.contentEditable=true;
                        td.addEventListener('update',function(){
                            var value = this.getTypedValue();
                            this.setAttribute('io-status', 'pending');
                            AjaxBestPromise.post({
                                url:'table/save-record',
                                data:{
                                    table:tableName,
                                    primaryKeyValues:JSON.stringify([row.atomic_number]),
                                    field:fieldDef.name,
                                    value:value
                                }
                            }).then(function(){
                                td.setAttribute('io-status', 'temporal-ok');
                                setTimeout(function(){
                                    td.setAttribute('io-status', 'ok');
                                },3000);
                            }).catch(function(err){
                                td.setAttribute('io-status', 'error');
                                td.title=err.message;
                            });
                        });
                        tr.appendChild(td);
                    });
                });
            });
        }).catch(function(err){
            my.log(err);
        })
    }
    createElements(){
        this.tableElement = html.table().create();
        return this.tableElement;
    }
    retriveAll(){
        var self = this;
        self.tableElement.innerHtml=html.caption(html.img({alt:'loading...', src:'loading.png')).toHtmlText();
        return AjaxBestPromise.get({
            url:'./tables/'+this.tableName,
            data:{}
        }).then(JSON.parse).then(function(result){
            self.tableDefinition = result['table-definition'];
            self.tableElement.caption = html.caption(self.tableDefinition.title);
            self.tableData = result['table-data'];
            self.tableTHead = self.tableElement.createTHead();
            self.tableElement.setAttribute('tedede-table', self.tableName);
            var row = self.tableTHead.insertRow(0);
            self.tableDefinition.columns.forEach(function(columnDef){
                row.appendChild(html.th(columnDef.title));
            });
        }).catch(function(err){
            console.log(err);
            self.tableElement.innerHtml=html.caption(err.message).toHtmlText();
        });
    }
}*/