
BBB_Handler.prototype._displayViewRecordingDialog = function() {
    this.sendRequest("getRecordingsCreatedByUser", this._displayViewRecordingDialogWithRecordings, {});
}

BBB_Handler.prototype._displayViewRecordingDialogWithRecordings = function(response) {
    var result = response._data.BigBlueButtonResponse; // simplify typing
    if (result.result === "SUCCESSED") {
        var tableID = 'viewRecordingSelectIDTable';
        var recordings = result.getRecordingsCreatedByUserResult.recordings;
        if (this.viewRecordingDlg) {
            this.clearSelectRecordIDTable(tableID);
            document.getElementById(tableID + "_BBB_noRecordingWarning").style.display = "none";
            document.getElementById(tableID + "_parent").style.display = "block";
            this._fillSelectRecordIDTable(tableID, recordings);
            this.viewRecordingDlg.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, this.viewRecording, [tableID, recordings]));
            this.viewRecordingDlg.popup();
            return;
        }

        this._viewRecordingDlgView = new DwtComposite(this.getShell());
        this._viewRecordingDlgView.setSize("600", "500");
        this._viewRecordingDlgView.getHtmlElement().style.overflow = "auto";
        this._viewRecordingDlgView.getHtmlElement().innerHTML = "<p id='" + tableID + "_BBB_noRecordingWarning' " +
            "style='display:none'>No recording available.</p><div style='height:150px; overflow-y:scroll; display:block;' id='" +
            tableID + "_parent'><table id='" + tableID + "'>" + 
            "<tr><td></td><td style='padding:0 20px 0 0;'>Meeting name:</td><td>Created on:</td></tr></table></div>";

        this._fillSelectRecordIDTable(tableID, recordings);

        this.viewRecordingDlg = new ZmDialog({
            parent: this.getShell(),
            title: this.getMessage("BigBlueButton_viewRecording"),
            view: this._viewRecordingDlgView,
            standardButtons: [DwtDialog.OK_BUTTON, DwtDialog.CANCEL_BUTTON]
        });
        this.viewRecordingDlg.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, this.viewRecording, [tableID, recordings]));
        this.viewRecordingDlg.popup();
    } else {
        var title = this.getMessage("BigBlueButton_getRecordingIDsFailed");
        var errMsg = "<p>Failed to get the recordIDs since the following error message:<br/>" + result.error_message +
                     "<br/><br/>Click 'OK' to try again.</p>";
        var callback = function () {
            this._displayViewRecordingDialog();
        }
        this.displayErrorDlg(title, errMsg, callback);
    }
}

BBB_Handler.prototype.viewRecording = function(tableID, recordings) {
    this.viewRecordingDlg.popdown();
    var selectedRecordID = this.findSelectedRecordID(tableID, recordings);
    if (selectedRecordID == null) {
        if (recordings === "") {
            return;
        }
        var title = this.getMessage("BigBlueButton_getRecordingNoIdSelected");
        var errMsg = "<p>Failed to open recording since:<br/>No recording was selected.<br/>" +
                     "<br/>Click 'OK' to try again.</p>";
        var callback = function () {
            this.viewRecordingDlg.popup();
        }
        this.displayErrorDlg(title, errMsg, callback);
        return;
    }
    this.sendRequest("getViewRecordingURL", this.handleViewRecordingResponse, {
        bigbluebutton_recordID: selectedRecordID
    });
}

BBB_Handler.prototype.handleViewRecordingResponse = function(response) {
    var result = response._data.BigBlueButtonResponse; // simplify typing
    if (result.result === "SUCCESSED") {
        window.open(result.getViewRecordingURLResult.join_url, '_blank');
    } else {
        var title = this.getMessage("BigBlueButton_viewRecordingFailed");
        var errMsg = this.getViewRecordingFailedHTML(result);
        var callback = function () {
            this.viewRecordingDlg.popup();
        }
        this.displayErrorDlg(title, errMsg, callback);
    }
}

BBB_Handler.prototype.getViewRecordingFailedHTML = function(result) {
  return ["<p>Failed to view the recording since the following error message: <br/><br/>",
          result.error_message,
          "<br/><br/>Click 'OK' to try again.</p>"].join("");
}
