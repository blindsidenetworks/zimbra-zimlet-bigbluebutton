
BBB_Handler.prototype._displayMeetingSummaryDialog = function(meetingID) {
    BBB_Handler.prototype._displayMeetingDetail = function(response) {
        var result = response._data.BigBlueButtonResponse; // simplify typing
        if (result.result === "SUCCESSED") {
            if (this.viewMeetingSummaryDlg) {
                this.hideUpdateRecordingButton();
                this.setMeetingSummaryDlgView(result.getMeetingDetailResult);
                this.viewMeetingSummaryDlg.popup();
                return;
            }

            this._viewMeetingSummaryDlgView = new DwtComposite(this.getShell());
            this._viewMeetingSummaryDlgView.setSize("600", "500");
            this._viewMeetingSummaryDlgView.getHtmlElement().style.overflow = "auto";
            this._viewMeetingSummaryDlgView.getHtmlElement().innerHTML = "<div id='BBB_MeetingSummaryViewDiv' />";

            const updateRecordingButtonID = Dwt.getNextId();
            const updateRecordingButton = new DwtDialog_ButtonDescriptor(updateRecordingButtonID,
            this.getMessage("BigBlueButton_updateRecordingButton"), DwtDialog.ALIGN_RIGHT);

            BBB_Handler.prototype.hideUpdateRecordingButton = function() {
                this.viewMeetingSummaryDlg.getButton(updateRecordingButtonID).setVisible(false);
            }

            BBB_Handler.prototype.displayUpdateRecordingButton = function(meetingID) {
                this.viewMeetingSummaryDlg.setButtonListener(updateRecordingButtonID, new AjxListener(this,
                    this.updateRecording, [meetingID]));
                this.viewMeetingSummaryDlg.getButton(updateRecordingButtonID).setVisible(true);
            }

            this.viewMeetingSummaryDlg = new ZmDialog({
                parent: this.getShell(),
                title: this.getMessage("BigBlueButton_viewMeetingSummary"),
                view: this._viewMeetingSummaryDlgView,
                standardButtons: [DwtDialog.OK_BUTTON],
                extraButtons: [updateRecordingButton]
            });
            this.viewMeetingSummaryDlg.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, function() {
                this.viewMeetingSummaryDlg.popdown();
            }));
            this.hideUpdateRecordingButton();
            this.setMeetingSummaryDlgView(result.getMeetingDetailResult);
            this.viewMeetingSummaryDlg.popup();
        } else {
            var title = this.getMessage("BigBlueButton_getMeetingDetailFailed");
            var errMsg = "<p>Failed to get the meeting detail since the following error message:<br/>"
                         + result.error_message + "</p>";
            var callback = function () {
                this._displayMeetingSummaryDialog(meetingID);
            }
            this.displayErrorDlg(title, errMsg, callback);
        }
    }

    this.sendRequest("getMeetingDetail", this._displayMeetingDetail, {
        bigbluebutton_meetingID: meetingID
    });
}

BBB_Handler.prototype.setMeetingSummaryDlgView = function(meetingSummary) {
    document.getElementById("BBB_MeetingSummaryViewDiv").innerHTML = "";

    var summaryTable = document.createElement("TABLE");
    
    var html = [];
    html.push("<table>");
    html.push("<tr><td>Meeting id</td><td>" + meetingSummary.meetingID + "</td></tr>");
    html.push("<tr><td style='padding:0 20px 0 0;'>Meeting name</td>",
        "<td>" + (meetingSummary.meetingName ? meetingSummary.meetingName : "") + "</td></tr>");
    html.push("<tr><td>Participants</td><td>" + meetingSummary.participants + "</td></tr>");
    html.push("<tr><td>Start time</td><td>" + (meetingSummary.createTime ? new Date(Number(meetingSummary.createTime)).toString() : "N/A") + "</td></tr>");
    html.push("<tr><td>End time</td><td>" + (meetingSummary.endTime ? new Date(Number(meetingSummary.endTime)).toString() : "N/A") + "</td></tr>");

    html.push("</table>");
    summaryTable.innerHTML = html.join("");

    var attendeeTable = document.createElement("DIV");
    var userCount = 1;
    html = [];
    html.push("<div style='height:100px; overflow-y:scroll; display:block;'>");
    html.push("<p>Attendees:</p><table>");
    html.push("<tr><td style='padding:0 20px 0 0;'>Display name</td><td>Email</td></tr>");
    while (meetingSummary["attendee" + userCount]) {
        html.push("<tr><td>" + meetingSummary["attendee" + userCount].name + "</td>");
        if (meetingSummary["attendee" + userCount].email) {
            html.push("<td>" + meetingSummary["attendee" + userCount].email + "</td></tr>");
        }

        ++userCount;
    }

    html.push("</table></div>");
    attendeeTable.innerHTML = html.join("");

    var recordingTable = document.createElement("DIV");
    if (meetingSummary.record) {
        recordingTable.innerHTML = ["<div><p>This meeting has 1 recording available.<br>",
            "Click <a href='", meetingSummary.record.playbackURL, "' target='_blank'>here</a>",
            " to view the recording.</p>", this._createInputTable(BBB_Handler.MANAGE_RECORDING_PROPS), "</div>"].join("");
        this.displayUpdateRecordingButton(meetingSummary.record.recordID);
    } else {
        recordingTable.innerHTML = "<div><p>This meeting has no recording available.</p></div>";
    }

    document.getElementById("BBB_MeetingSummaryViewDiv").appendChild(summaryTable);
    document.getElementById("BBB_MeetingSummaryViewDiv").appendChild(attendeeTable);
    document.getElementById("BBB_MeetingSummaryViewDiv").appendChild(recordingTable);
}