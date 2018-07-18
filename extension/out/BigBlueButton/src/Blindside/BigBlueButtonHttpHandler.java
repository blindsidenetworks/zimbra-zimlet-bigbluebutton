package Blindside;

import javax.servlet.ServletException;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.PrintWriter;
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.stream.Collectors;

import com.zimbra.common.soap.Element;
import com.zimbra.common.soap.SoapHttpTransport;
import com.zimbra.cs.extension.ExtensionHttpHandler;
import org.apache.commons.codec.binary.Base64;
import org.json.JSONObject;

public class BigBlueButtonHttpHandler extends ExtensionHttpHandler {
    private BigBlueButtonExt ext;

    BigBlueButtonHttpHandler(BigBlueButtonExt ext) {
        this.ext = ext;
    }

    public String getPath() {
        return super.getPath() + "/BigBlueButton";
    }
    
    private String getParameter(HttpServletRequest req, String param) throws UnsupportedEncodingException {
        return req.getParameter(param) == null ? null :
            URLDecoder.decode(req.getParameter(param), "UTF-8");
    }
    
    @Override
    public void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        try {
            String email = null, id = null, displayName = null;
            Cookie[] cookies = req.getCookies();
            cookies = cookies == null ? new Cookie[] {} : cookies;
            for (Cookie c : cookies) {
                if (c.getName().equalsIgnoreCase("ZM_AUTH_TOKEN")) {
                    String soapurl = "https://" + req.getLocalAddr() + "/service/soap/GetIdentitiesRequest";
                    SoapHttpTransport trans = new SoapHttpTransport(soapurl);
                    trans.setAuthToken(c.getValue());
                   
                    Element trequest = Element.XMLElement.mFactory.createElement("GetInfoRequest")
                            .addAttribute("xmlns", "urn:zimbraAccount");                
                    Element tresponse = trans.invoke(trequest);
                    String name = tresponse.getElement("name").toString();
                    email = name.substring(name.indexOf(">") + 1, name.indexOf("<", 5));
                    id = tresponse.getElement("id").toString();
                    id = id.substring(id.indexOf(">") + 1, id.indexOf("<", 4));
                    displayName = email.substring(0, email.indexOf("@"));
                }
            }

            String request = getParameter(req, "request");
            if (email == null && (request.equalsIgnoreCase("endMeeting") ||
                    request.equalsIgnoreCase("confirmedEndMeeting") ||
                    request.equalsIgnoreCase("getRecording"))) {
                resp.sendError(HttpServletResponse.SC_FORBIDDEN, "Please log in to zimbra first!");
                return;
            }
            
            BigBlueButtonWrapper wrapper = ext.getBBBWrapper();
            if (request.equalsIgnoreCase("joinMeetingWithInput")) {
                String meetingID = getParameter(req, "bigbluebutton_meetingID");
                displayName = getParameter(req, "bigbluebutton_displayName");
                String url = wrapper.getJoinMeetingURL(meetingID, displayName, email);
                resp.sendRedirect(url);
            } else if (request.equalsIgnoreCase("joinMeeting") || request.equalsIgnoreCase("joinApptMeeting")) {
                String meetingID = request.equalsIgnoreCase("joinMeeting") ?
                        getParameter(req, "bigbluebutton_meetingID") :
                        wrapper.findApptMeetingID(getParameter(req, "appointmentID"));

                PrintWriter out = resp.getWriter();
                String html = null;
                if (wrapper.meetingHasEnded(meetingID)) {
                    byte[] encoded = Files.readAllBytes(Paths.get(BigBlueButtonExt.HTML_MEETINGENDED_TEMPLATE));
                    html = new String(encoded, "UTF-8");
                } else {
                    byte[] encoded = Files.readAllBytes(Paths.get(BigBlueButtonExt.HTML_JOINMEETING_TEMPLATE));
                    html = new String(encoded, "UTF-8");
                    html = String.format(html, displayName == null ? "" : displayName, meetingID);
                }
                out.println(html);
            } else if (request.equalsIgnoreCase("endMeeting")) {
                String meetingID = getParameter(req, "bigbluebutton_meetingID");
                
                PrintWriter out = resp.getWriter();
                String html = null;
                if (wrapper.meetingHasEnded(meetingID)) {
                    byte[] encoded = Files.readAllBytes(Paths.get(BigBlueButtonExt.HTML_MEETINGENDED_TEMPLATE));
                    html = new String(encoded, "UTF-8");
                } else {
                    byte[] encoded = Files.readAllBytes(Paths.get(BigBlueButtonExt.HTML_ENDMEETING_TEMPLATE));
                    html = new String(encoded, "UTF-8");
                    int liveAttendee = wrapper.getNumLiveAttendee(meetingID);
                    html = String.format(html, liveAttendee, meetingID);
                }
                out.println(html);
            } else if (request.equalsIgnoreCase("confirmedEndMeeting")) {
                String meetingID = getParameter(req, "bigbluebutton_meetingID");
                boolean result = wrapper.endMeeting(meetingID, email);
                resp.setStatus(HttpServletResponse.SC_OK);
                resp.getWriter().write("End meeting '" + meetingID + "' result: " + Boolean.toString(result));
                resp.getWriter().flush();
                resp.getWriter().close();
            } else if (request.equalsIgnoreCase("getRecording")) {
                String recordingID = getParameter(req, "bigbluebutton_recordID");
                String meetingID = getParameter(req, "bigbluebutton_meetingID");
                String url = wrapper.getPlaybackURL(recordingID, meetingID);
                if (url == null) {
                    throw new Exception("Recording " + recordingID + " not found");
                }
                resp.sendRedirect(url);
            } else if (request.equalsIgnoreCase("meetingEnded")) {
                String meetingID = getParameter(req, "bigbluebutton_meetingID");
                String securitySalt = getParameter(req, "bigbluebutton_securitySalt");
                wrapper.endMeetingInDB(meetingID, securitySalt);
                resp.setStatus(HttpServletResponse.SC_OK);
            } else if (request.equalsIgnoreCase("logout")) {
                PrintWriter out = resp.getWriter();
                byte[] encoded = Files.readAllBytes(Paths.get(BigBlueButtonExt.HTML_LOGOUT_TEMPLATE));
                String html = new String(encoded, "UTF-8");
                out.println(html);
            } else {
                resp.sendError(HttpServletResponse.SC_NOT_FOUND, "Request not found");
            }
        } catch (Exception e) {
            resp.sendError(HttpServletResponse.SC_BAD_REQUEST, e.getMessage());
        }
    }

    @Override
    public void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        try {
            BigBlueButtonWrapper wrapper = ext.getBBBWrapper();
            String body = req.getReader().lines().collect(Collectors.joining(System.lineSeparator()));
            String request = req.getParameter("request");

            if (request.equalsIgnoreCase("recordingReady")) {
                String jwt = body.substring(body.indexOf("="));
                String[] split = jwt.split("\\.");
                Base64 base64url = new Base64(true);
                String jwtBody = new String(base64url.decode(split[1]));
                JSONObject json = new JSONObject(jwtBody);
                String meetingID = json.getString("meeting_id");
                String recordingID = json.has("record_id") ? json.getString("record_id") : null;
                wrapper.sendRecordingReadyEmail(meetingID, recordingID);
                resp.getOutputStream().println("Success");
            } else {
                resp.sendError(HttpServletResponse.SC_NOT_FOUND, "Request not found");
            }
        } catch (Exception e) {
            resp.sendError(HttpServletResponse.SC_BAD_REQUEST, e.getMessage());
        }
    }
}