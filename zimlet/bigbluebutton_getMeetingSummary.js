
BBB_Handler.prototype._displayGetMeetingSummaryDialog = function() {
    this.sendRequest("getMeetingsCreatedByUser", this._displayGetMeetingSummaryDialogWithMeetings, {});
}

BBB_Handler.prototype._displayGetMeetingSummaryDialogWithMeetings = function(response) {
    var result = response._data.BigBlueButtonResponse; // simplify typing
    if (result.result === "SUCCESSED") {
        var tableID = 'getMeetingSummarySelectIDTable';
        var callback = new AjxListener(this, function() {
            this.getMeetingSummaryDlg.popdown();
            var meetingID = this.findSelectedMeetingID(tableID, result.getMeetingsCreatedByUserResult.meetings);
            if (meetingID == null) {
                return;
            }
            this._handleViewMeetingDetail(meetingID)
        });

        if (this.getMeetingSummaryDlg) {
            this.clearSelectMeetingIDTable(tableID);
            document.getElementById(tableID + "_BBB_noMeetingWarning").style.display = "none";
            document.getElementById(tableID + "_parent").style.display = "block";
            this._fillSelectMeetingIDTable(tableID, result.getMeetingsCreatedByUserResult.meetings);
            this.getMeetingSummaryDlg.setButtonListener(DwtDialog.OK_BUTTON, callback);
            this.getMeetingSummaryDlg.popup();
            return;
        }

        this._getMeetingSummaryDlgView = new DwtComposite(this.getShell());
        this._getMeetingSummaryDlgView.setSize("600", "500");
        this._getMeetingSummaryDlgView.getHtmlElement().style.overflow = "auto";
        this._getMeetingSummaryDlgView.getHtmlElement().innerHTML = "<p id='" + tableID + "_BBB_noMeetingWarning' style='display:none'>" +
            "No meeting available.</p><div style='height:150px; overflow-y:scroll; display:block;' id='" + tableID + "_parent'><table id='" +
            tableID +"'><tr><td></td><td style='padding:0 20px 0 0;'>Meeting name:</td><td>Created on:</td></tr></table></div>";

        this._fillSelectMeetingIDTable(tableID, result.getMeetingsCreatedByUserResult.meetings);

        this.getMeetingSummaryDlg = new ZmDialog({
            parent: this.getShell(),
            title: this.getMessage("BigBlueButton_getMeetingSummary"),
            view: this._getMeetingSummaryDlgView,
            standardButtons: [DwtDialog.OK_BUTTON, DwtDialog.CANCEL_BUTTON]
        });

        this.getMeetingSummaryDlg.setButtonListener(DwtDialog.OK_BUTTON, callback);
        this.getMeetingSummaryDlg.popup();
    } else {
        var title = this.getMessage("BigBlueButton_getMeetingIDsFailed");
        var errMsg = "<p>Failed to get the meeting IDs since the following error message:<br/>" + result.error_message +
                     "<br/><br/>Click 'OK' to try again.</p>";
        var callback = function () {
            this._displayGetMeetingSummaryDialog();
        }
        this.displayErrorDlg(title, errMsg, callback);
    }
};

BBB_Handler.prototype.clearSelectMeetingIDTable = function(tableID) {
    var table = document.getElementById(tableID);
    table.innerHTML = "<tr><td></td><td style='padding:0 20px 0 0;'>Meeting name:</td><td>Created on:</td></tr>";
}

BBB_Handler.prototype._fillSelectMeetingIDTable = function(tableID, meetings) {
    if (meetings === "" || meetings == null) {
        document.getElementById(tableID + "_BBB_noMeetingWarning").style.display = "inline";
        document.getElementById(tableID + "_parent").style.display = "none";
        return;
    }

    var meetingsArr = meetings.split(",");
    var table = document.getElementById(tableID);
    meetingsArr.sort(function(a, b) {
        return Number(b.substring(b.indexOf("@") + 1)) - Number(a.substring(a.indexOf("@") + 1));
    });

    document.getElementById(tableID + "_parent").style.height = meetingsArr.length > 4 ? "180px" :
        (meetingsArr.length * 40 + 20) + "px";
    for (var i = 0; i < meetingsArr.length; ++i) {
        var meeting = meetingsArr[i];
        var meetingName = meeting.substring(0, meeting.indexOf(":"));
        var meetingID = meeting.substring(meeting.indexOf(":") + 1, meeting.indexOf("@"));
        var createTime = meeting.substring(meeting.indexOf("@") + 1);
        var row = table.insertRow();
        row.id = tableID + "_BBB_selectMeetingIDInput_" + i;
        var cell1 = row.insertCell(0);
        var cell2 = row.insertCell(1);
        var cell3 = row.insertCell(2);
        var cell4 = row.insertCell(3);

        cell1.innerHTML = "<input name='BBB_selectMeetingIDInput', id='" + tableID + "_BBB_selectMeetingIDInput_" +
            meetingID + "' " + "value='" + meetingID + "' type='radio' />";

        cell2.innerHTML = "<p>" + meetingName + "</p>";
        cell3.innerHTML = "<p>" + new Date(Number(createTime)).toString() + "</p>";
        cell4.innerHTML = "<div id='" + tableID + "_BBB_selectMeetingIDInput_" + meetingID + "_btn'>"

        var btn = new DwtButton({parent:this.getShell()});
        btn.setText(this.getMessage("BigBlueButton_selectMeetingIDViewDetail"));
        btn.addSelectionListener(new AjxListener(this, this._handleViewMeetingDetail, [meetingID]));
        document.getElementById(tableID + "_BBB_selectMeetingIDInput_" + meetingID + "_btn").appendChild(btn.getHtmlElement());
    }
}

BBB_Handler.prototype._handleViewMeetingDetail = function(meetingID) {
    BBB_Handler.prototype._displayMeetingDetail = function(response) {
        var result = response._data.BigBlueButtonResponse; // simplify typing
        if (result.result === "SUCCESSED") {
            if (this.viewMeetingSummaryDlg) {
                this.setMeetingSummaryDlgView(result.getMeetingDetailResult);
                this.viewMeetingSummaryDlg.popup();
                return;
            }

            this._viewMeetingSummaryDlgView = new DwtComposite(this.getShell());
            this._viewMeetingSummaryDlgView.setSize("600", "500");
            this._viewMeetingSummaryDlgView.getHtmlElement().style.overflow = "auto";
            this._viewMeetingSummaryDlgView.getHtmlElement().innerHTML = "<div id='BBB_MeetingSummaryViewDiv' />";
            this.setMeetingSummaryDlgView(result.getMeetingDetailResult);

            this.viewMeetingSummaryDlg = new ZmDialog({
                parent: this.getShell(),
                title: this.getMessage("BigBlueButton_viewMeetingSummary"),
                view: this._viewMeetingSummaryDlgView,
                standardButtons: [DwtDialog.OK_BUTTON]
            });
            this.viewMeetingSummaryDlg.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, function() {
                this.viewMeetingSummaryDlg.popdown();
            }));
            this.viewMeetingSummaryDlg.popup();
        } else {
            var title = this.getMessage("BigBlueButton_getMeetingDetailFailed");
            var errMsg = "<p>Failed to get the meeting detail since the following error message:<br/>" + result.error_message +
                         "<br/><br/>Click 'OK' to try again.</p>";
            var callback = function () {
                this._handleViewMeetingDetail(meetingID);
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

    document.getElementById("BBB_MeetingSummaryViewDiv").appendChild(summaryTable);
    document.getElementById("BBB_MeetingSummaryViewDiv").appendChild(attendeeTable);
}