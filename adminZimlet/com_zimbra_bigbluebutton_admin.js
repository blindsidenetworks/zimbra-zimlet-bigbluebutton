if(appNewUI && ZaSettings){
    console.log("loading")
    console.log(this);
    function com_zimbra_bigbluebutton_HandlerObject() {
        ZaItem.call(this, "com_zimbra_bigbluebutton_HandlerObject");
        console.log(this);
        console.log(this.appCtxt);
        this._init();
        this.type = "com_zimbra_bigbluebutton_HandlerObject";
    };
    com_zimbra_bigbluebutton_HandlerObject.prototype = new ZaItem;
    com_zimbra_bigbluebutton_HandlerObject.prototype.constructor = com_zimbra_bigbluebutton_HandlerObject;

    ZaZimbraAdmin._BIGBLUEBUTTON_VIEW = ZaZimbraAdmin.VIEW_INDEX++;

    ZaApp.prototype.getBigBlueButtonViewController =
        function() {
            if (this._controllers[ZaZimbraAdmin._BIGBLUEBUTTON_VIEW] == null)
                this._controllers[ZaZimbraAdmin._BIGBLUEBUTTON_VIEW] = new BigBlueButton_viewController(this._appCtxt, this._container);
            return this._controllers[ZaZimbraAdmin._BIGBLUEBUTTON_VIEW];
        }

    com_zimbra_bigbluebutton_HandlerObject.TreeListener = function (ev) {
        var bigbluebutton = new com_zimbra_bigbluebutton_HandlerObject();

        if(ZaApp.getInstance().getCurrentController()) {
            ZaApp.getInstance().getCurrentController().switchToNextView(ZaApp.getInstance().getBigBlueButtonViewController(),
                BigBlueButton_viewController.prototype.show, [bigbluebutton]);
        } else {
            ZaApp.getInstance().getBigBlueButtonViewController().show(bigbluebutton);
        }
    }

    com_zimbra_bigbluebutton_HandlerObject.TreeModifier = function (tree) {
        var overviewPanelController = this;
        if(ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.Client_UPLOAD_VIEW] || ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.CARTE_BLANCHE_UI]) {
            var parentPath = ZaTree.getPathByArray([ZaMsg.OVP_home, ZaMsg.OVP_toolMig]);

            var ti = new ZaTreeItemData({
                parent: parentPath,
                id: ZaId.getTreeItemId(ZaId.PANEL_APP, "magHV", null, "BigBlueButtonHV"),
                text: "BigBlueButton",
                mappingId: ZaZimbraAdmin._BIGBLUEBUTTON_VIEW});
            tree.addTreeItemData(ti);

            if(ZaOverviewPanelController.overviewTreeListeners) {
                ZaOverviewPanelController.overviewTreeListeners[ZaZimbraAdmin._BIGBLUEBUTTON_VIEW] = com_zimbra_bigbluebutton_HandlerObject.TreeListener;
            }
        }
    }

    if(ZaOverviewPanelController.treeModifiers)
        ZaOverviewPanelController.treeModifiers.push(com_zimbra_bigbluebutton_HandlerObject.TreeModifier);

}