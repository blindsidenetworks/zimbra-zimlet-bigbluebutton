
ZaItem.BIGBLUEBUTTON_ADMIN_EXT    = "BigBlueButtonAdminExt";
ZaItem.BIGBLUEBUTTON_DEFAULT_URL  = "http://test-install.blindsidenetworks.com/bigbluebutton/api";
ZaItem.BIGBLUEBUTTON_DEFAULT_SALT = "8cd8ef52e8e101574e400365b55e11a6";

function BigBlueButtonAdminExt(app) {
    if (arguments.length == 0) return;

    ZaItem.call(this, app, ZaItem.BIGBLUEBUTTON_ADMIN_EXT);
    this.type = ZaItem.BIGBLUEBUTTON_ADMIN_EXT;
    this._init(app);
}

BigBlueButtonAdminExt.prototype = new ZaItem;
BigBlueButtonAdminExt.prototype.constructor = BigBlueButtonAdminExt;

ZaZimbraAdmin._BIGBLUEBUTTON_VIEW = ZaZimbraAdmin.VIEW_INDEX++;

ZaApp.prototype.getBigBlueButtonViewController = function() {
    if (this._controllers[ZaZimbraAdmin._BIGBLUEBUTTON_VIEW] == null)
        this._controllers[ZaZimbraAdmin._BIGBLUEBUTTON_VIEW] = new BigBlueButton_viewController(this._appCtxt, this._container);
    return this._controllers[ZaZimbraAdmin._BIGBLUEBUTTON_VIEW];
}

BigBlueButtonAdminExt.TreeListener = function (ev) {
    var bigbluebutton = new BigBlueButtonAdminExt();

    if (ZaApp.getInstance().getCurrentController()) {
        ZaApp.getInstance().getCurrentController().switchToNextView(ZaApp.getInstance().getBigBlueButtonViewController(),
        BigBlueButton_viewController.prototype.show, [bigbluebutton]);
    } else {
        ZaApp.getInstance().getBigBlueButtonViewController().show(bigbluebutton);
    }
} 

BigBlueButtonAdminExt.TreeModifier = function (tree) {
    var overviewPanelController = this;
    if (ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.Client_UPLOAD_VIEW] ||
            ZaSettings.ENABLED_UI_COMPONENTS[ZaSettings.CARTE_BLANCHE_UI]) {
        var parentPath = ZaTree.getPathByArray([ZaMsg.OVP_home, ZaMsg.OVP_configure]);

        var ti = new ZaTreeItemData({
            parent: parentPath,
            id: ZaId.getTreeItemId(ZaId.PANEL_APP, "magHV", null, "BigBlueButtonHV"),
            text: "BigBlueButton",
            mappingId: ZaZimbraAdmin._BIGBLUEBUTTON_VIEW});
        tree.addTreeItemData(ti);

        if(ZaOverviewPanelController.overviewTreeListeners) {
            ZaOverviewPanelController.overviewTreeListeners[ZaZimbraAdmin._BIGBLUEBUTTON_VIEW] = BigBlueButtonAdminExt.TreeListener;
        }
    }
}

if (ZaOverviewPanelController.treeModifiers)
    ZaOverviewPanelController.treeModifiers.push(BigBlueButtonAdminExt.TreeModifier);

