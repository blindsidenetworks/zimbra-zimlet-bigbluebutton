set -e
# uncomment the following line if you want to trace the script
# set -x

# make sure the script can only be executed by root
if [ "$(id -u)" != "0" ]; then
    echo "Please run the script as root" 1>&2
    exit 1
fi

echo "Uninstalling BigBlueButton"
su - zimbra -c "zmzimletctl undeploy com_zimbra_bigbluebutton" # uninstall zimlet
rm -Rf /opt/zimbra/zimlets-deployed/com_zimbra_bigbluebutton
rm -Rf /opt/zimbra/lib/ext/BigBlueButton # remove server extension
rm -Rf /opt/zimbra/conf/BigBlueButton.properties

echo "----------------------------------------------------------------------------------"
echo "BigBlueButton uninstalled successfully."
echo "You still need to restart some services to load the changes:"
echo "su - zimbra -c \"zmmailboxdctl restart\""
echo " "
echo "For more information about BigBlueButton, please refer to the following link:"
echo "https://bigbluebutton.org/"


