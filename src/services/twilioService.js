export const sendSmsAlert = async (to, guardianName, scamText) => {
  const accountSid = import.meta.env.VITE_TWILIO_SID;
  const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
  const fromNumber = import.meta.env.VITE_TWILIO_NUMBER;

  const messageBody = `🚨 SAFE_VOICE ALERT: Potential scam detected! Context: "${scamText}"`;

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          'To': to,
          'From': fromNumber,
          'Body': messageBody
        })
      }
    );
    return response.ok;
  } catch (error) {
    console.error("SMS Error:", error);
    return false;
  }
};