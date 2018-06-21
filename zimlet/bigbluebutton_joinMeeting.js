/* Join meeting */
BBB_Handler.JOIN_MEETING_PROPS = [BBB_Handler.MEETING_ID];

BBB_Handler.prototype.joinMeeting = function () {
  // meeting id cannot be null
  if (document.getElementById("join_meeting_" + BBB_Handler.MEETING_ID.propId).value === "") {
    this.displayJoinMeetingWarning();
  } else {
    var input = this._getInput(BBB_Handler.JOIN_MEETING_PROPS, "join_meeting_");
    this.joinMeetingDlg.popdown();
    this.sendRequest("getJoinMeetingURL", this.handleJoinMeetingResponse, input);
  }
}

BBB_Handler.prototype.handleJoinMeetingResponse = function(response) {
  var result = response._data.BigBlueButtonResponse; // simplify typing
  if (result.result === "SUCCESSED") {
    window.open(result.getJoinMeetingURLResult.join_url, '_blank');
  } else {
    var title = this.getMessage("BigBlueButton_joinMeetingFailed");
    var errMsg = this.getJoinMeetingFailedHTML(result);
    var callback = function () {
      this.joinMeetingDlg.popup();
    }
    this.displayErrorDlg(title, errMsg, callback);
  }
};

BBB_Handler.prototype.getJoinMeetingFailedHTML = function(result) {
  return ["<p>Failed to join the meeting since the following error message: <br/>",
          result.error_message,
          "<br/><br/>Click 'OK' to try again.</p>"].join("");
}

BBB_Handler.prototype.displayJoinMeetingWarning = function() {
  document.getElementById("bigbluebutton_meetingIDWarning").style.display = "inline";
}

BBB_Handler.prototype._displayJoinMeetingDialog = function() {
  if (this.joinMeetingDlg) {
    this.joinMeetingDlg.popup();
    document.getElementById("bigbluebutton_meetingIDWarning").style.display = "none";
    return;
  }
  this._joinMeetingDlgView = new DwtComposite(this.getShell());
  this._joinMeetingDlgView.setSize("600", "500");
  this._joinMeetingDlgView.getHtmlElement().style.overflow = "auto";
  this._joinMeetingDlgView.getHtmlElement().innerHTML = this._createInputTable(BBB_Handler.JOIN_MEETING_PROPS, "join_meeting_");
  this.joinMeetingDlg = new ZmDialog({
    parent: this.getShell(),
    title: this.getMessage("BigBlueButton_joinMeeting"),
    view: this._joinMeetingDlgView,
    standardButtons: [DwtDialog.OK_BUTTON, DwtDialog.CANCEL_BUTTON]
  });
  this.joinMeetingDlg.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, this.joinMeeting));
  this.joinMeetingDlg.popup();
};
