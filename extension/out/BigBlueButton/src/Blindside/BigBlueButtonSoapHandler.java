package Blindside;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.Map;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.Element;
import com.zimbra.cs.account.Account;
import com.zimbra.soap.DocumentHandler;
import com.zimbra.soap.ZimbraSoapContext;
import BigBlueButton.api.BBBException;
import BigBlueButton.api.BBBMeeting;

import org.json.JSONException;
import org.json.JSONObject;

public class BigBlueButtonSoapHandler extends DocumentHandler {
    private BigBlueButtonExt ext;
    
    public BigBlueButtonSoapHandler(BigBlueButtonExt ext) {
        this.ext = ext;
    }

    public static String encode(String encodeStr) throws UnsupportedEncodingException {
        return encodeStr == null || "".equals(encodeStr) ? "" : URLEncoder.encode(encodeStr, "UTF-8");
    }
    
    @Override
    public Element handle(Element request, Map<String, Object> context) throws ServiceException {
        ZimbraSoapContext zsc = getZimbraSoapContext(context);
        Account acct = DocumentHandler.getAuthenticatedAccount(zsc);
        Element response = zsc.createElement("BigBlueButtonResponse");
        Element element = null;
        BigBlueButtonWrapper wrapper = ext.getBBBWrapper();
        try {
            String email = acct.getName();
            String id = acct.getId();
            String displayName = null;
            try {
                displayName = BigBlueButtonDBWrapper.getDisplayName(id);
            } catch (Exception e) { }
            displayName = displayName != null && !displayName.equalsIgnoreCase("") ?
                    displayName : email.substring(0, email.indexOf("@"));
            try {
                displayName = encode(displayName);
            } catch (UnsupportedEncodingException e) { }
            JSONObject jsonInput = new JSONObject(request.getAttribute("input"));
            String action = request.getAttribute("action");
            if (action.equalsIgnoreCase("createMeeting")) {
                String record = jsonInput.getString("bigbluebutton_recording");
                boolean recording = record.equalsIgnoreCase("yes") ? true : false;
                String meetingName = jsonInput.has("bigbluebutton_meetingName") ?
                        jsonInput.getString("bigbluebutton_meetingName") : null;
                
                BBBMeeting meeting = wrapper.createMeeting(meetingName, email, recording);
                
                response.addAttribute("result", "SUCCESSED");
                element = response.addUniqueElement("createMeetingResult");
                element.addAttribute("meeting_id", meeting.getMeetingID());
            } else if (action.equalsIgnoreCase("getJoinMeetingURL")) {
                String meetingID = jsonInput.getString("bigbluebutton_meetingID");
                String url = wrapper.getJoinMeetingURL(meetingID, displayName, email);
                response.addAttribute("result", "SUCCESSED");
                element = response.addUniqueElement("getJoinMeetingURLResult");
                element.addAttribute("join_url", url);
            } else if (action.equalsIgnoreCase("joinApptMeeting")) {
                String meetingName = jsonInput.getString("bigbluebutton_meetingName");
                String organizer = jsonInput.getString("appointment_organizer");
                String uid = jsonInput.getString("appointment_uid");
                String url = wrapper.getJoinApptMeetingURL(meetingName, displayName, organizer, uid, email);
                response.addAttribute("result", "SUCCESSED");
                element = response.addUniqueElement("joinApptMeetingURLResult");
                element.addAttribute("join_url", url);
            } else if (action.equalsIgnoreCase("endApptMeeting")) {
                String organizer = jsonInput.getString("appointment_organizer");
                String uid = jsonInput.getString("appointment_uid");
                boolean result = wrapper.endApptMeeting(uid, organizer);
                response.addAttribute("result", result ? "SUCCESSED" : "FAILED");
            } else if (action.equalsIgnoreCase("createApptMeeting")) {
                String meetingName = jsonInput.getString("bigbluebutton_meetingName");
                String organizer = jsonInput.getString("appointment_organizer");
                String uid = jsonInput.getString("appointment_uid");
                wrapper.createApptMeeting(meetingName, organizer, uid);
                response.addAttribute("result", "SUCCESSED");

            } else if (action.equalsIgnoreCase("updateRecording")) {
                String recordingID = jsonInput.getString("bigbluebutton_recordID");
                String updateType = jsonInput.getString("bigbluebutton_manageRecording");
                JSONObject userInput = jsonInput.has("bigbluebutton_userInput") ?
                        new JSONObject(jsonInput.getString("bigbluebutton_userInput")) : null;
                wrapper.updateRecording(recordingID, updateType, userInput);
                response.addAttribute("result", "SUCCESSED");
            } else if (action.equalsIgnoreCase("getViewRecordingURL")) {
                String recordingID = jsonInput.getString("bigbluebutton_recordID");
                String url = wrapper.getPlaybackURL(recordingID, null, "presentation");
                if (url == null) {
                    url = wrapper.getPlaybackURL(recordingID, null, "video");
                }
                if (url == null) {
                    throw new BBBException(BBBException.MESSAGEKEY_NOTFOUND,
                            "Recording " + recordingID + " not found");
                }

                response.addAttribute("result", "SUCCESSED");
                element = response.addUniqueElement("getViewRecordingURLResult");
                element.addAttribute("join_url", url);
            } else if (action.equalsIgnoreCase("getMeetingDetail")) {
                String meetingID = jsonInput.getString("bigbluebutton_meetingID");
                Map<String, Object> info = wrapper.getMeetingSummary(meetingID, email);
                response.addAttribute("result", "SUCCESSED");
                element = response.addUniqueElement("getMeetingDetailResult");
                element.addAttribute("meetingID", (String) info.get("meetingID"));
                element.addAttribute("meetingName", (String) info.get("meetingName"));
                element.addAttribute("createTime", (Long) info.get("createTime"));
                if (info.containsKey("endTime") && info.get("endTime").getClass() == Long.class) {
                    element.addAttribute("endTime", (Long) info.get("endTime"));
                }
                @SuppressWarnings("unchecked")
                ArrayList<Object> attendees = (ArrayList<Object>) info.get("attendees");
                element.addAttribute("participants", attendees.size());
                int userCount = 1;
                for (Object attendee : attendees) {
                    Element attendeeElm = element.addUniqueElement("attendee" + userCount);
                    @SuppressWarnings("unchecked")
                    Map<String, Object> attendeeInfo = (Map<String, Object>) attendee;
                    attendeeElm.addAttribute("name", (String) attendeeInfo.get("fullName"));
                    attendeeElm.addAttribute("email", (String) attendeeInfo.get("email"));
                    ++userCount;
                }
            } else if (action.equalsIgnoreCase("updatePreference")) {
                String newDispName = jsonInput.getString("bigbluebutton_displayName");
                String showInvitationStr = jsonInput.getString("bigbluebutton_showInvitation");
                boolean showInvitation = showInvitationStr.equalsIgnoreCase("yes") ? true : false;
                BigBlueButtonDBWrapper.updatePreference(id, newDispName, showInvitation);
                response.addAttribute("result", "SUCCESSED");
                element = response.addUniqueElement("updatePreferenceResult");
                element.addAttribute("displayName", displayName);
                element.addAttribute("showInvitation", showInvitation);
            } else if (action.equalsIgnoreCase("getPreference")) {
                JSONObject preference = BigBlueButtonDBWrapper.getPreference(id);
                if (preference == null) {
                    preference = new JSONObject();
                    preference.put("displayName", displayName);
                    preference.put("showInvitation", true);
                }
                response.addAttribute("result", "SUCCESSED");
                element = response.addUniqueElement("getPreferenceResult");
                element.addAttribute("displayName", preference.getString("displayName"));
                element.addAttribute("showInvitation", preference.getString("showInvitation"));
            } else if (action.equalsIgnoreCase("getMeetingsCreatedByUser")) {
                String meetings = BigBlueButtonDBWrapper.getUserCreatedMeeting(email);
                response.addAttribute("result", "SUCCESSED");
                element = response.addUniqueElement("getMeetingsCreatedByUserResult");
                element.addAttribute("meetings", meetings);
            } else if (action.equalsIgnoreCase("getRecordingsCreatedByUser")) {
                String meetings = BigBlueButtonDBWrapper.getUserCreatedMeeting(email);
                String recordingIDs = "";
                if (!meetings.equalsIgnoreCase("")) {
                    String[] meetingsArr = meetings.split(",");
                    for (String meeting : meetingsArr) {
                        String meetingName = meeting.indexOf(":") == -1 ? null : meeting.substring(0, meeting.indexOf(":"));
                        String meetingID = meeting.substring(meeting.indexOf(":") + 1, meeting.indexOf("@"));
                        String createTime = meeting.substring(meeting.indexOf("@") + 1);
                        String recordingID = wrapper.getRecordingIDs(meetingID);
                        if (recordingID != "") {
                            recordingIDs += meetingName == null ? "" : meetingName + ":";
                            recordingIDs += recordingID + "@" + createTime + ",";
                        }
                    }
                    
                    recordingIDs = recordingIDs.equalsIgnoreCase("") ? recordingIDs :
                        recordingIDs.substring(0, recordingIDs.length() - 1);
                } 
                
                response.addAttribute("result", "SUCCESSED");
                element = response.addUniqueElement("getRecordingsCreatedByUserResult");
                element.addAttribute("recordings", recordingIDs);
            } else if (action.equalsIgnoreCase("getRecordingDetail")) {
                String recordID = jsonInput.getString("bigbluebutton_recordID");
                Map<String, Object> info = wrapper.getRecordInfo(recordID);
                
                response.addAttribute("result", "SUCCESSED");
                element = response.addUniqueElement("getRecordingDetailResult");
                element.addAttribute("meetingID", (String) info.get("meetingID"));
                element.addAttribute("name", (String) info.get("name"));
                element.addAttribute("startTime", (String) info.get("startTime"));
                element.addAttribute("endTime", (String) info.get("endTime"));
                element.addAttribute("participants", (String) info.get("participants"));
                element.addAttribute("playbackURL", (String) info.get("playbackURL"));
                element.addAttribute("published", (String) info.get("published"));
            } else if (action.equalsIgnoreCase("getActiveMeetingsCreatedByUser")) {
                String meetings = BigBlueButtonDBWrapper.getUserCreatedMeeting(email, true);
                response.addAttribute("result", "SUCCESSED");
                element = response.addUniqueElement("getActiveMeetingsCreatedByUserResult");
                element.addAttribute("meetings", meetings);
            } else if (action.equalsIgnoreCase("endMeeting")) {
                String meetingID = jsonInput.getString("bigbluebutton_meetingID");
                wrapper.endMeeting(meetingID, email);
                response.addAttribute("result", "SUCCESSED");
            } else if (action.equalsIgnoreCase("getNumAttendee")) {
                String meetingID = jsonInput.getString("bigbluebutton_meetingID");
                int participantCount = wrapper.getNumLiveAttendee(meetingID);
                response.addAttribute("result", "SUCCESSED");
                element = response.addUniqueElement("getNumAttendeeResult");
                element.addAttribute("participantCount", participantCount);
            } else if (action.equalsIgnoreCase("getNumAttendeeForApptMeeting")) {
                String uid = jsonInput.getString("appointment_uid");
                String meetingID = wrapper.findApptMeetingID(uid);
                int participantCount = wrapper.getNumLiveAttendee(meetingID);
                response.addAttribute("result", "SUCCESSED");
                element = response.addUniqueElement("getNumAttendeeForApptMeetingResult");
                element.addAttribute("participantCount", participantCount);
            } else if (action.equalsIgnoreCase("createMeetingForEmail")) {
                String meetingName = jsonInput.has("bigbluebutton_meetingName") ?
                        jsonInput.getString("bigbluebutton_meetingName") : null;
                BBBMeeting meeting = wrapper.createMeeting(meetingName, email, false);
                response.addAttribute("result", "SUCCESSED");
                element = response.addUniqueElement("createMeetingForEmailResult");
                element.addAttribute("meetingID", meeting.getMeetingID());
            } else {
                throw new BBBException(BBBException.MESSAGEKEY_UNREACHABLE, "Action not found");
            }

            return response;
        } catch (BBBException | JSONException e) {
            System.out.print("BigBlueButton failed to handle soap request " + e.getMessage());
            e.printStackTrace();
            response.addAttribute("result", "FAILED");
            response.addAttribute("error_message", e.getMessage());
            return response;
        }
    }
}
