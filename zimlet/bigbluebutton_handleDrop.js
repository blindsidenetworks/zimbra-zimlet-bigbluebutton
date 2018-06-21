BBB_Handler.prototype.handleDrop = function(droppedItem) {
    switch(droppedItem[0].TYPE) {
        case "ZmMailMsg":
        case "ZmConv":
            this.emailDropped(droppedItem);
            break;
        case "ZmContact":
            this.contactDropped(droppedItem);
            break;
        case "ZmAppt":
            this.appointmentDropped(droppedItem);
            break;
    }
}

BBB_Handler.prototype.emailDropped = function(emailList) {
    if (!(emailList instanceof Array)) {
        emailList = [emailList];
    }
    var attendees = [];
    for (var i = 0; i < emailList.length; ++i) {
        var email = emailList[i];
        var participants = email.participants;
        for (var j = 0; j < participants.length; ++j) {
            var participant = participants[j];
            attendees.push({email: participant.getAddress()});
        }
    }
    this._displayCreateMeetingDialog(attendees); // locate in bigbluebutton_createMeeting.js
}

BBB_Handler.prototype.contactDropped = function(contactList) {
    if (!(contactList instanceof Array)) {
        contactList = [contactList];
    }
    var attendees = [];
    for (var i = 0; i < contactList.length; ++i) {
        var contact = contactList[i];
        var email = contact.email ? contact.email : (contact.email2 ? contact.email2 : (contact.email3 ? contact.email3 : ""));
        if (email != "") {
            attendees.push({email: email});
        }        
    }
    this._displayCreateMeetingDialog(attendees); // locate in bigbluebutton_createMeeting.js
}

BBB_Handler.prototype.appointmentDropped = function(appointments) {
    if (!(appointments instanceof Array)) {
        appointments = [appointments];
    }
    var appt = appointments[0].srcObj;

    this.sendJoinApptMeetingReq(appt, this); // locate in bigblluebutton_appointment.js
}

