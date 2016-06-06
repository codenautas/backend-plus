class TddTable{
    constructor(tableName){
        this.tableName = tableName;
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
}