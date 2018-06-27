BigBlueButton_viewController = function(appCtxt, container) {
    ZaXFormViewController.call(this, appCtxt, container, "BigBlueButton_viewController");
    this._UICreated = false;
    this.tabConstructor = BigBlueButton_tab;
    this._appCtxt = appCtxt;
}

BigBlueButton_viewController.prototype = new ZaXFormViewController();
BigBlueButton_viewController.prototype.constructor = BigBlueButton_viewController;

ZaController.setViewMethods["BigBlueButton_viewController"] = [];

BigBlueButton_viewController.setViewMethod = function (item) {
    if(!this._UICreated) {
        this._contentView = this._view = new this.tabConstructor(this._container, this._appCtxt);
        var elements = new Object();
        elements[ZaAppViewMgr.C_APP_CONTENT] = this._view;
        ZaApp.getInstance().getAppViewMgr().createView(this.getContentViewId(), elements);
        this._UICreated = true;
        ZaApp.getInstance()._controllers[this.getContentViewId ()] = this;
    }

    ZaApp.getInstance().pushView(this.getContentViewId());

}
ZaController.setViewMethods["BigBlueButton_viewController"].push(BigBlueButton_viewController.setViewMethod) ;
