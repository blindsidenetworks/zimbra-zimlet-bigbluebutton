package Blindside;

import java.util.ArrayList;
import java.util.Map;
import java.util.Properties;

import javax.mail.Message;
import javax.mail.MessagingException;
import javax.mail.Session;
import javax.mail.Transport;
import javax.mail.internet.InternetAddress;
import javax.mail.internet.MimeMessage;

import com.zimbra.soap.DocumentHandler;

public class BigBlueButtonHelper {

    private static String formateDuration(Long duration) {
        String str = "";
        if (duration >= 60 * 60 * 24) {
            str += duration / (60 * 60 * 24) + " days ";
            duration = duration % (60 * 60 * 24);
        }
        if (duration >= 60 * 60) {
            str += duration / (60 * 60) + " hours ";
            duration = duration % (60 * 60);
        }
        if (duration >= 60) {
            str += duration / 60 + " minutes ";
            duration = duration % 60;
        }
        if (duration != 0) {
            str += duration + " seconds ";
            duration = (long) 0;
        }

        return str;
    }

    @SuppressWarnings("unchecked")
    public static void sendMeetingSummaryEmail(String destination, Map<String, Object> meetingInfo) throws Exception {
        String fromEmail = "admin@" + DocumentHandler.getLocalHost();
        Properties properties = System.getProperties();
        properties.setProperty("mail.smtp.host", DocumentHandler.getLocalHost());
        Session session = Session.getDefaultInstance(properties);
        try {
            MimeMessage message = new MimeMessage(session);
            message.setFrom(new InternetAddress(fromEmail));
            message.addRecipient(Message.RecipientType.TO, new InternetAddress(destination));
            message.setSubject("BigBlueButton meeting summary for: " + meetingInfo.get("meetingID"));

            String content = "";
            content += "Meeting ID: " + meetingInfo.get("meetingID") + "\n";
            String name = meetingInfo.containsKey("meetingName") && meetingInfo.get("meetingName") != null ?
                    (String) meetingInfo.get("meetingName") : "";
            content += "Meeting Name: " + name + "\n";
            if (meetingInfo.containsKey("createTime")) {
                Long endTime = meetingInfo.containsKey("endTime") ? (long) meetingInfo.get("endTime")
                        : System.currentTimeMillis();
                Long duration = endTime - (Long) meetingInfo.get("createTime");
                content += "Duration: " + formateDuration(duration / 1000) + "\n";
            }
            ArrayList<Object> attendees = (ArrayList<Object>) meetingInfo.get("attendees");
            content += "Number of participant: " + attendees.size() + "\n";
            content += "Attendees:" + "\n";
            int userCount = 1;
            for (Object attendee : attendees) {
                content += "  - Attendee #" + userCount + ": ";
                Map<String, Object> attendeeInfo = (Map<String, Object>) attendee;
                content += "Name: " + attendeeInfo.get("fullName");
                if (attendeeInfo.containsKey("email") && attendeeInfo.get("email") != null) {
                    content += ", Email: " + attendeeInfo.get("email");
                }
                content += "\n";
                ++userCount;
            }
            content += "\n";
            content += "If you recorded this meeting, your recording will be ready in a few minutes "
                    + "and you will receive a notification email.";

            message.setText(content);
            Transport.send(message);
        } catch (MessagingException e) {
            throw new Exception(e.getMessage());
        }
    }

    public static void sendRecordReadyEmail(String localAddr, String destination, String meetingID, String recordID,
            ArrayList<Map<String, Object>> statistics) throws Exception {
        try {
            String fromEmail = "admin@" + DocumentHandler.getLocalHost();
            Properties properties = System.getProperties();
             properties.setProperty("mail.smtp.host", DocumentHandler.getLocalHost());
            Session session = Session.getDefaultInstance(properties);
            MimeMessage message = new MimeMessage(session);
            message.setFrom(new InternetAddress(fromEmail));
            message.addRecipient(Message.RecipientType.TO, new InternetAddress(destination));
            message.setSubject("BigBlueButton notice: recording for meeting: " + meetingID + " is ready!");
            String getRecordingURL = "https://" + localAddr +
                    "/service/extension/BigBlueButtonExt/BigBlueButton?request=getRecording&" +
                    (recordID == null ? "bigbluebutton_meetingID=" + meetingID :
                    "bigbluebutton_recordID=" + recordID);
            String content = "";
            content += recordID == null ? "<p>Meeting id: " + meetingID + "<br>" :
                    "<p>Recording id: " + recordID + "<br>";
            content += "Click <a href='" + getRecordingURL +
                    "' target='_blank'>here</a> to go to the recording.</p>";
            if (statistics != null) {
                content += "<br><br>";
                content += "<p>Meeting statistics:</p>";
                content += "<table style='border: 1px solid black'><tr>";
                content += "<td style='border: 1px solid black'>Name:</td>"
                        + "<td style='border: 1px solid black'>Join:</td>"
                        + "<td style='border: 1px solid black'>Left:</td>"
                        + "<td style='border: 1px solid black'>Duration:</td>"
                        + "<td style='border: 1px solid black'>Talk time:</td>"
                        + "<td style='border: 1px solid black'>Participations:</td>";
                content += "</tr>";
                for (Map<String, Object> stat : statistics) {
                    content += "<tr>";
                    content += "<td style='border: 1px solid black'>" + stat.get("Name") + "</td>";
                    content += "<td style='border: 1px solid black'>" + stat.get("Join") + "</td>";
                    content += "<td style='border: 1px solid black'>" + stat.get("Left") + "</td>";
                    content += "<td style='border: 1px solid black'>" + stat.get("Duration") + "</td>";
                    content += "<td style='border: 1px solid black'>" + stat.get("Talk_time") + "</td>";
                    content += "<td style='border: 1px solid black'><table>";
                    content += "<tr><td style='border: 1px solid black'>Chat:</td><td style='border: 1px solid black'>"
                            + stat.get("Chats") + "</td></tr>";
                    content += "<tr><td style='border: 1px solid black'>Talk:</td><td style='border: 1px solid black'>"
                            + stat.get("Talks") + "</td></tr>";
                    content += "<tr><td style='border: 1px solid black'>Emoji:</td><td style='border: 1px solid black'>"
                            + stat.get("Emojis") + "</td></tr>";
                    content += "<tr><td style='border: 1px solid black'>Vote:</td><td style='border: 1px solid black'>"
                            + stat.get("Poll_votes") + "</td></tr>";
                    content += "<tr><td style='border: 1px solid black'>Raise hand:</td><td style='border: 1px solid black'>"
                            + stat.get("Raisehand") + "</td></tr>";
                    content += "</table></td>";
                    content += "</tr>";
                }
                content += "</table>";
            }
    
            message.setContent(content, "text/html");
            Transport.send(message);
        } catch (MessagingException e) {
            throw new Exception(e.getMessage());
        }
    }
}
