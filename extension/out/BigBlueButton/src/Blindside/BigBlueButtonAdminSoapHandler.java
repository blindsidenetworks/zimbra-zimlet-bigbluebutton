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
            
            JSONObject jsonInput = new JSONObject(request.getAttribute("input"));
            String action = request.getAttribute("action");
            
            if (action.equalsIgnoreCase("saveCredential")) {
                ext.updateCredential(jsonInput.getString("bigbluebutton_serverURL"),
                        jsonInput.getString("bigbluebutton_securitySalt"));
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
