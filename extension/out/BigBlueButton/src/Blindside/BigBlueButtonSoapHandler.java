package Blindside;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.Element;
import com.zimbra.cs.account.Account;
import com.zimbra.soap.DocumentHandler;
import com.zimbra.soap.ZimbraSoapContext;
import BigBlueButton.api.BBBException;
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
            String displayName = acct.getDisplayName();
            displayName = displayName != null && !displayName.equalsIgnoreCase("") ?
                    displayName : email.substring(0, email.indexOf("@"));
            try {
                displayName = encode(displayName);
            } catch (UnsupportedEncodingException e) { }
            JSONObject jsonInput = new JSONObject(request.getAttribute("input"));
            String action = request.getAttribute("action");
            String meetingID = null, meetingName = null, url = null;
            String organizer = null, uid = null;
            
            switch (action) {
            case "getRandomMeetingID":
                meetingID = wrapper.getRandomMeetingID();
                response.addAttribute("result", "SUCCESSED");
                element = response.addUniqueElement("getRandomMeetingIDResult");
                element.addAttribute("meeting_id", meetingID);
                break;
            case "createMeeting":
                meetingID = jsonInput.getString("bigbluebutton_meetingID");
                meetingName = jsonInput.has("bigbluebutton_meetingName") ?
                        jsonInput.getString("bigbluebutton_meetingName") : null;
                boolean recording = jsonInput.getBoolean("bigbluebutton_recording");
                wrapper.createMeeting(meetingID, email, meetingName, recording);
                response.addAttribute("result", "SUCCESSED");
                element = response.addUniqueElement("updateMeetingResult");
                element.addAttribute("join_url", wrapper.getJoinMeetingURL(meetingID, displayName, email));
                break;
            case "getMeetingsCreatedByUser":
                String meetingIDs = BigBlueButtonDBWrapper.getUserCreatedMeeting(email);
                response.addAttribute("result", "SUCCESSED");
                element = response.addUniqueElement("getMeetingsCreatedByUserResult");
                element.addAttribute("meetingIDs", meetingIDs);
                break;
            case "getMeetingStatus":
                meetingID = jsonInput.getString("bigbluebutton_meetingID");
                response.addAttribute("result", "SUCCESSED");
                element = response.addUniqueElement("getMeetingStatusResult");
                try {
                    BigBlueButtonDBWrapper.findMeeting(meetingID);
                    element.addAttribute("meetingExist", true);
                    boolean isOwner = wrapper.findCreator(meetingID).equalsIgnoreCase(email) ?
                            true : false;
                    element.addAttribute("isOwner", isOwner);
                    if (BigBlueButtonDBWrapper.meetingHasEnded(meetingID)) {
                        element.addAttribute("meetingEnded", true);
                    } else {
                        element.addAttribute("meetingEnded", false);
                        element.addAttribute("attendeeCount", wrapper.getNumLiveAttendee(meetingID));
                    }
                } catch (BBBException e) { // meeting doesn't exist
                    element.addAttribute("meetingExist", false);
                }
                break;
            case "getJoinMeetingURL":
                meetingID = jsonInput.getString("bigbluebutton_meetingID");
                url = wrapper.getJoinMeetingURL(meetingID, displayName, email);
                response.addAttribute("result", "SUCCESSED");
                element = response.addUniqueElement("getJoinMeetingURLResult");
                element.addAttribute("join_url", url);
                break;
            case "endMeeting":
                meetingID = jsonInput.getString("bigbluebutton_meetingID");
                wrapper.endMeeting(meetingID, email);
                response.addAttribute("result", "SUCCESSED");
                break;
            case "createMeetingForEmail":
                meetingName = jsonInput.has("bigbluebutton_meetingName") ?
                        jsonInput.getString("bigbluebutton_meetingName") : null;
                meetingID = wrapper.createEmailMeeting(meetingName, email);
                response.addAttribute("result", "SUCCESSED");
                element = response.addUniqueElement("createMeetingForEmailResult");
                element.addAttribute("meetingID", meetingID);
                break;
            case "getMeetingDetail":
                meetingID = jsonInput.getString("bigbluebutton_meetingID");
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
                if (info.containsKey("recording")) {
                    Element record = element.addUniqueElement("record");
                    System.out.println("BigBlueButton: " + info.get("recording"));
                    @SuppressWarnings("unchecked")
                    HashMap<String, String> recordingInfo = (HashMap<String, String>) info.get("recording");
                    record.addAttribute("playbackURL", recordingInfo.get("playbackURL"));
                    record.addAttribute("recordID", recordingInfo.get("recordID"));
                }
                break;
            case "createApptMeeting":
                meetingName = jsonInput.getString("bigbluebutton_meetingName");
                organizer = jsonInput.getString("appointment_organizer");
                uid = jsonInput.getString("appointment_uid");
                wrapper.createApptMeeting(meetingName, organizer, uid);
                response.addAttribute("result", "SUCCESSED");
                break;
            case "joinApptMeeting":
                meetingName = jsonInput.getString("bigbluebutton_meetingName");
                organizer = jsonInput.getString("appointment_organizer");
                uid = jsonInput.getString("appointment_uid");
                url = wrapper.getJoinApptMeetingURL(meetingName, displayName, organizer, uid, email);
                response.addAttribute("result", "SUCCESSED");
                element = response.addUniqueElement("joinApptMeetingURLResult");
                element.addAttribute("join_url", url);
                break;
            case "getNumAttendeeForApptMeeting":
                uid = jsonInput.getString("appointment_uid");
                int participantCount = wrapper.getNumLiveAttendeeForApptMeeting(uid);
                response.addAttribute("result", "SUCCESSED");
                element = response.addUniqueElement("getNumAttendeeForApptMeetingResult");
                element.addAttribute("participantCount", participantCount);
                break;
            case "endApptMeeting":
                organizer = jsonInput.getString("appointment_organizer");
                uid = jsonInput.getString("appointment_uid");
                boolean result = wrapper.endApptMeeting(uid, organizer);
                response.addAttribute("result", result ? "SUCCESSED" : "FAILED");
                break;
            case "updateRecording":
                String recordingID = jsonInput.getString("bigbluebutton_recordID");
                String updateType = jsonInput.getString("bigbluebutton_manageRecording");
                JSONObject userInput = jsonInput.has("bigbluebutton_userInput") ?
                        new JSONObject(jsonInput.getString("bigbluebutton_userInput")) : null;
                wrapper.updateRecording(recordingID, updateType, userInput);
                response.addAttribute("result", "SUCCESSED");
                break;
            default:
                ServiceException.FAILURE("No such action: " + action,
                        new Exception("No such action: " + action));
            }

            return response;
        } catch (Exception e) {
            System.out.println("BigBlueButton failed to handle soap request " + e.getMessage());
            e.printStackTrace();
            response.addAttribute("result", "FAILED");
            response.addAttribute("error_message", e.getMessage());
            return response;
        }
    }
}
