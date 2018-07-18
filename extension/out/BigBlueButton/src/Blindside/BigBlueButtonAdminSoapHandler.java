package Blindside;

import java.util.Map;

import org.json.JSONException;
import org.json.JSONObject;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.Element;
import com.zimbra.cs.account.Account;
import com.zimbra.soap.DocumentHandler;
import com.zimbra.soap.ZimbraSoapContext;

import BigBlueButton.api.BBBException;

public class BigBlueButtonAdminSoapHandler extends DocumentHandler {
    private BigBlueButtonExt ext;
    
    public BigBlueButtonAdminSoapHandler(BigBlueButtonExt ext) {
        this.ext = ext;
    }
    
    @Override
    public Element handle(Element request, Map<String, Object> context) throws ServiceException {
        ZimbraSoapContext zsc = getZimbraSoapContext(context);
        Account acct = DocumentHandler.getAuthenticatedAccount(zsc);
        Element response = zsc.createElement("BigBlueButtonResponse");
        
        try {
            String email = acct.getName();
            if (!email.startsWith("admin")) {
                ServiceException.FAILURE("Authentication failed",
                        new Exception("Authentication failed"));
            }
            
            String action = request.getAttribute("action");
            
            if (action.equalsIgnoreCase("getCredential")) {
                JSONObject credentials = ext.getCredential();
                response.addAttribute("result", "SUCCESSED");
                response.addAttribute("bigbluebutton_serverURL",
                        credentials.getString("bigbluebutton_serverURL"));
                response.addAttribute("bigbluebutton_securitySalt",
                        credentials.getString("bigbluebutton_securitySalt"));
            } else if (action.equalsIgnoreCase("saveCredential")) {
                JSONObject jsonInput = new JSONObject(request.getAttribute("input"));
                String url = jsonInput.getString("bigbluebutton_serverURL");
                String salt = jsonInput.getString("bigbluebutton_securitySalt");
                BigBlueButtonWrapper wrapper = ext.getBBBWrapper();
                wrapper.verifyBigBlueButtonServer(url, salt);
                ext.updateCredential(url, salt);
                response.addAttribute("result", "SUCCESSED");
            } else {
                throw new BBBException(BBBException.MESSAGEKEY_UNREACHABLE, "Action not found");
            }
            
        } catch (JSONException | BBBException e) {
            response.addAttribute("result", "FAILED");
            response.addAttribute("error_message", e.getMessage());
        }
        return response;
    }

}
