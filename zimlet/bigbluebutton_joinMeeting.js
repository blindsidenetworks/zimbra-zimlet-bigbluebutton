/* Join meeting */
BBB_Handler.JOIN_MEETING_PROPS = [BBB_Handler.MEETING_ID];

BBB_Handler.prototype._displayJoinMeetingDialog = function() {
    const autoCompleteItemCallback = (function(_this) {
        return function(item) {
            _this.sendRequest("getMeetingStatus", function(response) {
                _this.updateJoinMeetingMeetingStatus(response);
            }, {
                "bigbluebutton_meetingID": item
            });
        }
    })(this);

    if (this.joinMeetingDlg) {
        this.joinMeetingDlg.popup();
        this._clearInputTable(BBB_Handler.JOIN_MEETING_PROPS, "join_meeting_");
        document.getElementById("BigBlueButton_joinMeetingMeetingStatusDiv").style.display = "none";
        this.sendRequest("getMeetingsCreatedByUser", function(response) {
            var result = response._data.BigBlueButtonResponse; // simplify typing
            if (result.result === "SUCCESSED") {
                var meetingIDs = result.getMeetingsCreatedByUserResult.meetingIDs;
                var meetingIDArr = meetingIDs && meetingIDs != "" ? meetingIDs.split(",") : [];

                autocomplete(document.getElementById("join_meeting_bigbluebutton_meetingID"),
                    meetingIDArr, autoCompleteItemCallback);
            }
        });
        return;
    }
    this._joinMeetingDlgView = new DwtComposite(this.getShell());
    this._joinMeetingDlgView.setSize("600", "500");
    this._joinMeetingDlgView.getHtmlElement().style.overflow = "auto";
    this._joinMeetingDlgView.getHtmlElement().innerHTML = "<form autocomplete='off'>" +
        this._createInputTable(BBB_Handler.JOIN_MEETING_PROPS, "join_meeting_") + "</form>" +
        "<div style='width: 200px; text-align:center;display:none' id='BigBlueButton_joinMeetingMeetingStatusDiv'>" +
        "<p id='BigBlueButton_joinMeetingMeetingStatus'></p></div>";

    ((function(_this) {
        return function() {
            var field = document.getElementById("join_meeting_bigbluebutton_meetingID");
            function onInputChange(event) {
                var value = this.value;
                if (value.length == 11 && /[0-9a-zA-Z]{3}-[0-9a-zA-Z]{3}-[0-9a-zA-Z]{3}/.test(value)) {
                    _this.sendRequest("getMeetingStatus", function(response) {
                        _this.updateJoinMeetingMeetingStatus(response);
                    }, {
                        "bigbluebutton_meetingID": value
                    });
                } else {
                    _this.displayJoinMeetingInvalidMeetingID();
                }
            }

            if (field.addEventListener) {
                field.addEventListener("input", onInputChange);
            } else if (field.attachEvent) { // IE8 and earlier versions
                field.attachEvent("oninput", onInputChange);
            }
        }
    })(this))()

    const joinMeetingButtonID = Dwt.getNextId();
    const joinMeetingButton = new DwtDialog_ButtonDescriptor(joinMeetingButtonID,
        this.getMessage("BigBlueButton_joinMeetingButton"), DwtDialog.ALIGN_RIGHT);

    const cancelButtonID = Dwt.getNextId();
    const cancelButton = new DwtDialog_ButtonDescriptor(cancelButtonID,
        this.getMessage("BigBlueButton_cancelButton"), DwtDialog.ALIGN_RIGHT);

    BBB_Handler.prototype.hideJoinMeetingButton = function() {
        this.joinMeetingDlg.getButton(joinMeetingButtonID).setVisible(false);
    }

    BBB_Handler.prototype.displayJoinMeetingButton = function() {
        this.joinMeetingDlg.getButton(joinMeetingButtonID).setVisible(true);
    }

    this.joinMeetingDlg = new ZmDialog({
        parent: this.getShell(),
        title: this.getMessage("BigBlueButton_joinMeeting"),
        view: this._joinMeetingDlgView,
        extraButtons: [joinMeetingButton, cancelButton],
        standardButtons: DwtDialog.NO_BUTTONS
    });

    this.joinMeetingDlg.setButtonListener(joinMeetingButtonID, new AjxListener(this, this.joinMeeting));
    this.joinMeetingDlg.setButtonListener(cancelButtonID, new AjxListener(this, function() {
        this.joinMeetingDlg.popdown();
    }));
    this.hideJoinMeetingButton();
    this.joinMeetingDlg.popup();

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
            autocomplete(document.getElementById("join_meeting_bigbluebutton_meetingID"),
                meetingIDArr, autoCompleteItemCallback);
        }
    });
};

BBB_Handler.prototype.updateJoinMeetingMeetingStatus = function(response) {
    var result = response._data.BigBlueButtonResponse; // simplify typing
    if (result.result === "SUCCESSED") {
        document.getElementById("BigBlueButton_joinMeetingMeetingStatusDiv").style.display = "block";
        var content, meetingStatus = result.getMeetingStatusResult;
        if (!meetingStatus.meetingExist) {
            content = "Meeting doesn't exist!";
            this.hideJoinMeetingButton();
        } else {
            if (meetingStatus.meetingEnded) {
                content = "Meeting has already ended.";
                this.hideJoinMeetingButton();
            } else {
                content = "Meeting is in progress, and " + meetingStatus.attendeeCount +
                    " people is in the meeting right now.";
                this.displayJoinMeetingButton();
            }
        }

        document.getElementById("BigBlueButton_joinMeetingMeetingStatus").innerHTML = content;
    } else {
        content = "Failed to load meeting status, please try again!";
        this.hideJoinMeetingButton();
    }
}

BBB_Handler.prototype.displayJoinMeetingInvalidMeetingID = function() {
    this.hideJoinMeetingButton();
    document.getElementById("BigBlueButton_joinMeetingMeetingStatusDiv").style.display = "block";
    document.getElementById("BigBlueButton_joinMeetingMeetingStatus").innerHTML =
        "Invalid meeting ID, meeting ID should look like XXX-XXX-XXX.";
}

BBB_Handler.prototype.joinMeeting = function () {
    var input = this._getInput(BBB_Handler.JOIN_MEETING_PROPS, "join_meeting_");
    this.joinMeetingDlg.popdown();
    this.sendRequest("getJoinMeetingURL", this.handleJoinMeetingResponse, input);
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
            result.error_message, "</p>"].join("");
}
