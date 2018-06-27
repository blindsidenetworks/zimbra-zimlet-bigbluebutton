
/* End meeting */
BBB_Handler.END_MEETING_PROPS = [BBB_Handler.MEETING_ID];

BBB_Handler.prototype._displayEndMeetingDialog = function() {
    const autoCompleteItemCallback = (function(_this) {
        return function(item) {
            _this.sendRequest("getMeetingStatus", function(response) {
                _this.updateEndMeetingMeetingStatus(response);
            }, {
                "bigbluebutton_meetingID": item
            });
        }
    })(this);

    if (this.endMeetingDlg) {
        this.hideEndMeetingButton();
        this.hideViewMeetingSummaryButton();
        this.endMeetingDlg.popup();
        this._clearInputTable(BBB_Handler.END_MEETING_PROPS, "end_meeting_");
        document.getElementById("BigBlueButton_endMeetingMeetingStatusDiv").style.display = "none";
        this.sendRequest("getMeetingsCreatedByUser", function(response) {
            var result = response._data.BigBlueButtonResponse; // simplify typing
            if (result.result === "SUCCESSED") {
                var meetingIDs = result.getMeetingsCreatedByUserResult.meetingIDs;
                var meetingIDArr = meetingIDs && meetingIDs != "" ? meetingIDs.split(",") : [];
                autocomplete(document.getElementById("end_meeting_bigbluebutton_meetingID"),
                    meetingIDArr, autoCompleteItemCallback);
            }
        });
        return;
    }
    this._endMeetingDlgView = new DwtComposite(this.getShell());
    this._endMeetingDlgView.setSize("600", "500");
    this._endMeetingDlgView.getHtmlElement().style.overflow = "auto";
    this._endMeetingDlgView.getHtmlElement().innerHTML = "<form autocomplete='off'>" +
        this._createInputTable(BBB_Handler.END_MEETING_PROPS, "end_meeting_") + "</form>" +
        "<div style='width: 200px; text-align:center;display:none' id='BigBlueButton_endMeetingMeetingStatusDiv'>" +
        "<p id='BigBlueButton_endMeetingMeetingStatus'></p></div>";

    ((function(_this) {
        return function() {
            var field = document.getElementById("end_meeting_bigbluebutton_meetingID");
            function onInputChange(event) {
                var value = this.value;
                if (value.length == 11 && /[0-9a-zA-Z]{3}-[0-9a-zA-Z]{3}-[0-9a-zA-Z]{3}/.test(value)) {
                    _this.sendRequest("getMeetingStatus", function(response) {
                        _this.updateEndMeetingMeetingStatus(response);
                    }, {
                        "bigbluebutton_meetingID": value
                    });
                } else {
                    _this.displayEndMeetingInvalidMeetingID();
                }
            }

            if (field.addEventListener) {
                field.addEventListener("input", onInputChange);
            } else if (field.attachEvent) { // IE8 and earlier versions
                field.attachEvent("oninput", onInputChange);
            }
        }
    })(this))()

    const endMeetingButtonID = Dwt.getNextId();
    const endMeetingButton = new DwtDialog_ButtonDescriptor(endMeetingButtonID,
        this.getMessage("BigBlueButton_endMeetingButton"), DwtDialog.ALIGN_RIGHT);

    const viewMeetingSummaryButtonID = Dwt.getNextId();
    const viewMeetingSummaryButton = new DwtDialog_ButtonDescriptor(viewMeetingSummaryButtonID,
        this.getMessage("BigBlueButton_viewMeetingSummaryButton"), DwtDialog.ALIGN_RIGHT);

    const cancelButtonID = Dwt.getNextId();
    const cancelButton = new DwtDialog_ButtonDescriptor(cancelButtonID,
        this.getMessage("BigBlueButton_cancelButton"), DwtDialog.ALIGN_RIGHT);

    BBB_Handler.prototype.hideEndMeetingButton = function() {
        this.endMeetingDlg.getButton(endMeetingButtonID).setVisible(false);
    }

    BBB_Handler.prototype.displayEndMeetingButton = function(participantCount) {
        this.endMeetingDlg.setButtonListener(endMeetingButtonID, new AjxListener(this,
            this.endMeeting, [participantCount]));
        this.endMeetingDlg.getButton(endMeetingButtonID).setVisible(true);
    }

    BBB_Handler.prototype.hideViewMeetingSummaryButton = function() {
        this.endMeetingDlg.getButton(viewMeetingSummaryButtonID).setVisible(false);
    }

    BBB_Handler.prototype.displayViewMeetingSummaryButton = function() {
        this.endMeetingDlg.getButton(viewMeetingSummaryButtonID).setVisible(true);
    }

    this.endMeetingDlg = new ZmDialog({
        parent: this.getShell(),
        title: this.getMessage("BigBlueButton_endMeeting"),
        view: this._endMeetingDlgView,
        extraButtons: [endMeetingButton, viewMeetingSummaryButton, cancelButton],
        standardButtons: DwtDialog.NO_BUTTONS
    });

    this.hideEndMeetingButton();
    this.hideViewMeetingSummaryButton();
    this.endMeetingDlg.setButtonListener(viewMeetingSummaryButtonID, new AjxListener(this, (function() {
        return function() {
            var input = this._getInput(BBB_Handler.JOIN_MEETING_PROPS, "end_meeting_");
            this._displayMeetingSummaryDialog(input.bigbluebutton_meetingID);
        }
    })()));
    this.endMeetingDlg.setButtonListener(cancelButtonID, new AjxListener(this, function() {
        this.endMeetingDlg.popdown();
    }))
    this.endMeetingDlg.popup();

    this.sendRequest("getMeetingsCreatedByUser", function(response) {
        var result = response._data.BigBlueButtonResponse; // simplify typing
        if (result.result === "SUCCESSED") {
            var sheet = document.createElement('style')
            sheet.innerHTML = ".autocomplete {position: relative; display: inline-block;}" +
                ".autocomplete-items {position: absolute;border: 1px solid #d4d4d4;border-bottom: none;border-top: none;z-index: 99;top: 100%;left: 0;right: 0;}" +
                ".autocomplete-items div {padding: 10px;cursor: pointer;background-color: #fff;border-bottom: 1px solid #d4d4d4;}" +
                ".autocomplete-active {background-color: DodgerBlue !important;color: #ffffff;}";
            document.body.appendChild(sheet);
            var meetingIDs = result.getMeetingsCreatedByUserResult.meetingIDs;
            var meetingIDArr = meetingIDs && meetingIDs != "" ? meetingIDs.split(",") : [];
            autocomplete(document.getElementById("end_meeting_bigbluebutton_meetingID"),
                meetingIDArr, autoCompleteItemCallback);
        }
    });
};

BBB_Handler.prototype.updateEndMeetingMeetingStatus = function(response) {
    var result = response._data.BigBlueButtonResponse; // simplify typing
    if (result.result === "SUCCESSED") {
        document.getElementById("BigBlueButton_endMeetingMeetingStatusDiv").style.display = "block";
        var content, meetingStatus = result.getMeetingStatusResult;
        if (!meetingStatus.meetingExist) {
            content = "Meeting doesn't exist!";
            this.hideEndMeetingButton();
            this.hideViewMeetingSummaryButton();
        } else {
            if (meetingStatus.isOwner) {
                this.displayViewMeetingSummaryButton();
            } else {
                this.hideViewMeetingSummaryButton();
            }
            if (meetingStatus.meetingEnded) {
                content = "Meeting has already ended.";
                this.hideEndMeetingButton();
            } else {
                content = "Meeting is in progress, and " + meetingStatus.attendeeCount +
                    " people is in the meeting right now.";
                if (meetingStatus.isOwner) {
                    this.displayEndMeetingButton(meetingStatus.attendeeCount);
                }
            }
        }

        document.getElementById("BigBlueButton_endMeetingMeetingStatus").innerHTML = content;
    } else {
        content = "Failed to load meeting status, please try again!";
        this.hideEndMeetingButton();
    }
}

BBB_Handler.prototype.displayEndMeetingInvalidMeetingID = function() {
    this.hideEndMeetingButton();
    this.hideViewMeetingSummaryButton();
    document.getElementById("BigBlueButton_endMeetingMeetingStatusDiv").style.display = "block";
    document.getElementById("BigBlueButton_endMeetingMeetingStatus").innerHTML =
        "Invalid meeting ID, meeting ID should look like XXX-XXX-XXX.";
}

BBB_Handler.prototype.endMeeting = function(participantCount) {
    var input = this._getInput(BBB_Handler.JOIN_MEETING_PROPS, "end_meeting_");
    this.endMeetingDlg.popdown();

    var content = "<b>WARNING</b><br/>There are " + participantCount + " users currently in the " +
        "meeting, they will be logged out if you end this meeting.<br/><br/>Are you sure you want to " +
        "end this meeting? (Click 'ok' to end the meeting)"

    var title = this.getMessage("BigBlueButton_endMeetingConfirmTitle");
    var okCallback = function() {
        this.sendRequest("endMeeting", this.handleEndMeetingResponse, input);
    }
    var cancelCallback = function() {
        this.endMeetingDlg.popup();
    }
    this.displayConfirmationDialog(title, content, okCallback, cancelCallback);
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
        var errMsg = "<p>Failed to end the meeting since the following error message:<br/>"
                     + result.error_message + "</p>";
        var callback = function () {
            this.endMeetingDlg.popup();
        }
        this.displayErrorDlg(title, errMsg, callback);
    }
}

