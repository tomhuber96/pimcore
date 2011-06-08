/**
 * Pimcore
 *
 * LICENSE
 *
 * This source file is subject to the new BSD license that is bundled
 * with this package in the file LICENSE.txt.
 * It is also available through the world-wide-web at this URL:
 * http://www.pimcore.org/license
 *
 * @copyright  Copyright (c) 2009-2010 elements.at New Media Solutions GmbH (http://www.elements.at)
 * @license    http://www.pimcore.org/license     New BSD License
 */


/**
 * NOTE: This helper-methods are added to the classes pimcore.object.edit, pimcore.object.fieldcollection, pimcore.object.tags.localizedfields
 */

pimcore.registerNS("pimcore.object.helpers.grid");
pimcore.object.helpers.grid = Class.create({

    limit: 15,
    baseParams: {},
    showSubtype: true,
    showKey: true,
    enableEditor: false,

    initialize: function(selectedClass, fields, url, baseParams, isSearch) {
        this.selectedClass = selectedClass;
        this.fields = fields;
//        this.validFieldTypes = ["textarea","input","checkbox","select","numeric","wysiwyg","image","geopoint","country","href","multihref","objects","language","table","date","datetime","time","link","multiselect","password","slider","user"];
//        this.editableFieldTypes = ["textarea","input","checkbox","select","numeric","wysiwyg","country","language","user"]
        this.isSearch = isSearch;

        this.url = url;
        if(baseParams) {
            this.baseParams = baseParams;
        } else {
            this.baseParams = {};
        }

        if(!this.baseParams.limit) {
            this.baseParams.limit = this.limit;
        }
        if(!this.baseParams["class"]) {
            this.baseParams["class"] = this.selectedClass;
        }
    },

    getStore: function() {

        // the store
        var readerFields = [];
        readerFields.push({name: "id", allowBlank: true});
        readerFields.push({name: "fullpath", allowBlank: true});
        readerFields.push({name: "published", allowBlank: true});
        readerFields.push({name: "type", allowBlank: true});
        readerFields.push({name: "subtype", allowBlank: true});
        readerFields.push({name: "filename", allowBlank: true});
        readerFields.push({name: "classname", allowBlank: true});
        readerFields.push({name: "creationDate", allowBlank: true});
        readerFields.push({name: "modificationDate", allowBlank: true});
        readerFields.push({name: "inheritedFields", allowBlank: false});

        for (var i = 0; i < this.fields.length; i++) {
            readerFields.push({name: this.fields[i].key, allowBlank: true});
        }

        var proxy = new Ext.data.HttpProxy({
            url: this.url,
            method: 'post'
        });
        var reader = new Ext.data.JsonReader({
            totalProperty: 'total',
            successProperty: 'success',
            root: 'data'
        }, readerFields);

        var writer = null;
        var listeners = {};
        if(this.enableEditor) {
            writer = new Ext.data.JsonWriter();
            listeners.write = function(store, action, result, response, rs) {};
            listeners.exception = function (conn, mode, action, request, response, store) {
                    if(action == "update") {
                        Ext.MessageBox.alert(t('error'), t('cannot_save_object_please_try_to_edit_the_object_in_detail_view'));
                        this.store.rejectChanges();
                    }
                }.bind(this);
        }

        var store = new Ext.data.Store({
            restful: false,
            idProperty: 'id',
            remoteSort: true,
            proxy: proxy,
            reader: reader,
            writer: writer,
            listeners: listeners,
            baseParams: this.baseParams
        });

        return store;

    },

    selectionColumn: null,
    getSelectionColumn: function() {
        if(this.selectionColumn == null) {
            this.selectionColumn = new Ext.grid.CheckboxSelectionModel();
        }
        return this.selectionColumn;
    },

    getGridColumns: function() {
        // get current class
        var classStore = pimcore.globalmanager.get("object_types_store");
        var klassIndex = classStore.findExact("text", this.selectedClass);
        var klass = classStore.getAt(klassIndex);
        var propertyVisibility = klass.get("propertyVisibility");

        if(this.isSearch) {
            propertyVisibility = propertyVisibility.search;
        } else {
            propertyVisibility = propertyVisibility.grid;
        }
        var showKey = propertyVisibility.path;
        if(this.showKey) {
            showKey = true;
        }

        // init grid-columns
        var gridColumns = [];

        var editor = null;
        if(this.enableEditor) {
            var selectionColumn = this.getSelectionColumn();
            gridColumns.push(selectionColumn);
        }

        gridColumns.push({header: t("type"), width: 40, sortable: true, dataIndex: 'subtype', hidden: !this.showSubtype, renderer: function (value, metaData, record, rowIndex, colIndex, store) {
                return '<div style="height: 16px;" class="pimcore_icon_asset  pimcore_icon_' + value + '" name="' + t(record.data.subtype) + '">&nbsp;</div>';
            }});
        gridColumns.push({header: 'ID', width: 40, sortable: true, dataIndex: 'id', hidden: !propertyVisibility.id});
        gridColumns.push({header: t("published"), width: 40, sortable: true, dataIndex: 'published', hidden: !propertyVisibility.published});
        gridColumns.push({header: t("path"), width: 200, sortable: true, dataIndex: 'fullpath', hidden: !propertyVisibility.path});
        gridColumns.push({header: t("filename"), width: 200, sortable: true, dataIndex: 'filename', hidden: !showKey});
        gridColumns.push({header: t("class"), width: 200, sortable: true, dataIndex: 'classname',renderer: function(v){return ts(v);}, hidden: true});
        gridColumns.push({header: t("creationdate") + " (System)", width: 200, sortable: true, dataIndex: "creationDate", editable: false, renderer: function(d) {
                            var date = new Date(d * 1000);
                            return date.format("Y-m-d H:i:s");
                        }, hidden: !propertyVisibility.creationDate});
        gridColumns.push({header: t("modificationdate") + " (System)", width: 200, sortable: true, dataIndex: "modificationDate", editable: false, renderer: function(d) {
                            var date = new Date(d * 1000);
                            return date.format("Y-m-d H:i:s");
                        }, hidden: !propertyVisibility.modificationDate});

        var fields = this.fields;
        for (var i = 0; i < fields.length; i++) {
            gridColumns.push(pimcore.object.tags[fields[i].type].prototype.getGridColumnConfig(fields[i]));
            // is visible or not
            if(this.isSearch) {
                gridColumns[gridColumns.length-1].hidden = !fields[i].visibleSearch;
            } else {
                gridColumns[gridColumns.length-1].hidden = !fields[i].visibleGridView;
            }
            gridColumns[gridColumns.length-1].layout = fields[i];

        }


        return gridColumns;
    },

    getGridFilters: function() {
        var selectFilterFields;

        var configuredFilters = [{
            type: "date",
            dataIndex: "creationDate"
        },{
            type: "date",
            dataIndex: "modificationDate"
        }];

        var fields = this.fields;
        for (var i = 0; i < fields.length; i++) {

            var filter = pimcore.object.tags[fields[i].type].prototype.getGridColumnFilter(fields[i]);
            if(filter) {
                configuredFilters.push(filter);
            }

        }

        // filters
        var gridfilters = new Ext.ux.grid.GridFilters({
            encode: true,
            local: false,
            filters: configuredFilters
        });

        return gridfilters;

    }
});
