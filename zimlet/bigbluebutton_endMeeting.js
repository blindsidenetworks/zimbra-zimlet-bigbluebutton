
BBB_Handler.prototype._displayEndMeetingDialog = function() {
    this.sendRequest("getActiveMeetingsCreatedByUser", this._displayEndMeetingDialogWithMeetings, {});
}

BBB_Handler.prototype._displayEndMeetingDialogWithMeetings = function(response) {
    var result = response._data.BigBlueButtonResponse; // simplify typing
    if (result.result === "SUCCESSED") {
        var tableID = 'endMeetingSelectIDTable';
        var meetings = result.getActiveMeetingsCreatedByUserResult.meetings;
        if (this.endMeetingDlg) {
            this.clearSelectMeetingIDTable(tableID);
            document.getElementById(tableID + "_BBB_noMeetingWarning").style.display = "none";
            document.getElementById(tableID + "_parent").style.display = "block";
            this._fillSelectMeetingIDTable(tableID, meetings);
            this.endMeetingDlg.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, this.endMeeting, [tableID, meetings]));
            this.endMeetingDlg.popup();
            return;
        }

        this._endMeetingDlgView = new DwtComposite(this.getShell());
        this._endMeetingDlgView.setSize("600", "500");
        this._endMeetingDlgView.getHtmlElement().style.overflow = "auto";
        this._endMeetingDlgView.getHtmlElement().innerHTML = "<p id='" + tableID + "_BBB_noMeetingWarning' style='display:none'>" +
            "No meeting is in progress.</p><div style='height:150px; overflow-y:scroll; display:block;' id='" + tableID + "_parent'>" +
            "<table id='" + tableID + "'><tr><td></td><td style='padding:0 20px 0 0;'>Meeting name:</td><td>Created on:</td></table></div>";

        this._fillSelectMeetingIDTable(tableID, meetings);

        this.endMeetingDlg = new ZmDialog({
            parent: this.getShell(),
            title: this.getMessage("BigBlueButton_endMeeting"),
            view: this._endMeetingDlgView,
            standardButtons: [DwtDialog.OK_BUTTON, DwtDialog.CANCEL_BUTTON]
        });
        this.endMeetingDlg.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, this.endMeeting, [tableID, meetings]));
        this.endMeetingDlg.popup();
    } else {
        var title = this.getMessage("BigBlueButton_getActiveMeetingFailed");
        var errMsg = "<p>Failed to get the meeting IDs since the following error message:<br/>" + result.error_message +
                     "<br/><br/>Click 'OK' to try again.</p>";
        var callback = function () {
            this._displayEndMeetingDialog();
        }
        this.displayErrorDlg(title, errMsg, callback);
    }
};

BBB_Handler.prototype.endMeeting = function(tableID, meetings) {
    var selectedMeeting = this.findSelectedMeetingID(tableID, meetings);
    this.endMeetingDlg.popdown();
    if (selectedMeeting == null) {
        if (meetings === "") {
            return;
        }
        var title = this.getMessage("BigBlueButton_endMeetingNoIdSelected");
        var errMsg = "<p>Failed to end the meeting since the following error message:<br/>No meeting id was selected!" +
                     "<br/><br/>Click 'OK' to try again.</p>";
        var callback = function () {
            this.endMeetingDlg.popup();
        }
        this.displayErrorDlg(title, errMsg, callback);
        return;
    }

    BBB_Handler.prototype.displayEndMeetingConfirmationWindow = function(response) {
        var result = response._data.BigBlueButtonResponse; // simplify typing
        if (result.result === "SUCCESSED") {
            var participantCount = result.getNumAttendeeResult.participantCount;
            var content = "<b>WARNING</b><br/>There are " + participantCount + " users currently in the " +
                "meeting, they will be logged out if you end this meeting.<br/><br/>Are you sure you want to " +
                "end this meeting? (Click 'ok' to end the meeting)"

            var title = this.getMessage("BigBlueButton_endMeetingConfirmTitle");
            var okCallback = function() {
                this.sendRequest("endMeeting", this.handleEndMeetingResponse, {
                    bigbluebutton_meetingID: selectedMeeting
                });
            }
            var cancelCallback = function() {
                this.endMeetingDlg.popup();
            }
            this.displayConfirmationDialog(title, content, okCallback, cancelCallback);
        } else {
            var title = this.getMessage("BigBlueButton_endMeetingFailed");
            var errMsg = "<p>Failed to end the meeting since the following error message:<br/>" + result.error_message +
                         "<br/><br/>Click 'OK' to try again.</p>";
            var callback = function () {
                this.endMeetingDlg.popup();
            }
            this.displayErrorDlg(title, errMsg, callback);
        }
    }

    this.sendRequest("getNumAttendee", this.displayEndMeetingConfirmationWindow, {
        bigbluebutton_meetingID: selectedMeeting
    });
}

BBB_Handler.prototype.findSelectedMeetingID = function(tableID, meetings) {
    if (meetings === "") {
        return null;
    }
    var meetingsArr = meetings.split(",");
    for (var i = 0; i < meetingsArr.length; ++i) {
        var meeting = meetingsArr[i];
        var meetingID = meeting.substring(meeting.indexOf(":") + 1, meeting.indexOf("@"));
        if (document.getElementById(tableID + "_BBB_selectMeetingIDInput_" + meetingID).checked) {
            return meetingID;
        }
    }
}

BBB_Handler.prototype.handleEndMeetingResponse = function(response) {
    var result = response._data.BigBlueButtonResponse; // simplify typing
    if (result.result === "SUCCESSED") {
        if (this.endMeetingResponseDlg) {
            this.endMeetingResponseDlg.popup();
            return;
        }    
        this._endMeetingResponseDlgView = new DwtComposite(this.getShell());
        this._endMeetingResponseDlgView.setSize("600", "500");
        this._endMeetingResponseDlgView.getHtmlElement().style.overflow = "auto";
        this._endMeetingResponseDlgView.getHtmlElement().innerHTML = "<p>End meeting successed.</p>";
        
        this.endMeetingResponseDlg = new ZmDialog({
            parent: this.getShell(),
            title: this.getMessage("BigBlueButton_endMeetingSuccessed"),
            view: this._endMeetingResponseDlgView,
            standardButtons: [DwtDialog.OK_BUTTON]
        });
        this.endMeetingResponseDlg.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, function() {
            this.endMeetingResponseDlg.popdown();
        }));
        this.endMeetingResponseDlg.popup();
    } else {
        var title = this.getMessage("BigBlueButton_endMeetingFailed");
        var errMsg = "<p>Failed to end the meeting since the following error message:<br/>" + result.error_message +
                     "<br/><br/>Click 'OK' to try again.</p>";
        var callback = function () {
            this.endMeetingDlg.popup();
        }
        this.displayErrorDlg(title, errMsg, callback);
    }
}