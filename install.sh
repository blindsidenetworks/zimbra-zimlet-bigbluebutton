set -e
# uncomment the following line if you want to trace the script
# set -x

# make sure the script can only be executed by root
if [ "$(id -u)" != "0" ]; then
    echo "Please run the script as root" 1>&2
    exit 1
fi

cwd=$(pwd)
serverExt="/opt/zimbra/lib/ext/BigBlueButton"

# make sure zip is installed
set +e
ZIP_CMD=$(which zip)
set -e
if [[ -z $ZIP_CMD ]]; then
  apt-get install zip
fi

echo "Remove existing BigBlueButton"
rm -Rf /opt/zimbra/zimlets-deployed/com_zimbra_bigbluebutton
rm -Rf /opt/zimbra/lib/ext/BigBlueButton

echo "Installing BigBlueButton"
echo "Deploy BigBlueButton zimlet"
cd $cwd/zimlet/
zip -r $cwd/com_zimbra_bigbluebutton.zip *
su - zimbra -c "zmzimletctl deploy $cwd/com_zimbra_bigbluebutton.zip"

echo "Deploy BigBlueButton server extension"
# Create folder for server extension
mkdir -p $serverExt
cp $cwd/extension/out/BigBlueButton/BigBlueButton.jar $serverExt/BigBlueButton.jar
chmod 444 $cwd/template/*
cp $cwd/template/* $serverExt/


echo "Installing BigBlueButton admin"
echo "Deploy BigBlueButton admin zimlet"
cd $cwd/adminZimlet/
zip -r $cwd/com_zimbra_bigbluebutton_admin.zip *
su - zimbra -c "zmzimletctl deploy $cwd/com_zimbra_bigbluebutton_admin.zip"

confFile=$cwd/BigBlueButton.properties

function getProperty {
   PROP_KEY=$1
   PROP_VALUE=`cat $confFile | grep "$PROP_KEY" | cut -d'=' -f2`
   echo $PROP_VALUE
}
URL=$(getProperty "URL")
securitySalt=$(getProperty "securitySalt")
if [ "$URL" = "" ]; then
   	echo "BigBlueButton installation error: URL cannot be null, please config the config.properties file and continue"
    exit 1
fi
if [ "$securitySalt" = "" ]; then
    echo "BigBlueButton installation error: securitySalt cannot be null, please config the config.properties file and continue"
    exit 1
fi

echo "Config required configurations for BigBlueButton"
cp $cwd/BigBlueButton.properties /opt/zimbra/conf/BigBlueButton.properties

echo "----------------------------------------------------------------------------------"
echo "BigBlueButton installed successfully."
echo 
echo "However, you need to disable csrf token check to fix the Zimbra Web Client AJAX problem such that the application can execute successfully, more information about this bug can be found here:"
echo "https://wiki.zimbra.com/wiki/Fix_a_Zimbra_Web_Client_AJAX_problem_after_upgraded_to_ZCS_8.6"
echo
echo "su - zimbra -c \"zmprov mcf zimbraCsrfTokenCheckEnabled FALSE\""
echo
echo "At last, you need to restart mailboxd to load the changes:"
echo
echo "su - zimbra -c \"zmmailboxdctl restart\""
echo
echo "For more information about BigBlueButton, please refer to the following link:"
echo "https://bigbluebutton.org/"
echo

