const { parseEmails, sendViaSendGridApi } = require('./sendGridApi');

const sendTestEmail = async (smtpConfig, from, to, cc, bcc) => {
    if (!smtpConfig?.authPass || smtpConfig?.authUser !== 'apikey') {
        throw new Error(
            'Test email uses SendGrid HTTPS API only: authUser must be "apikey" and authPass your SendGrid API key.'
        );
    }

    const htmlTemplate = `
   
    <!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/svg+xml" href="https://converg-frontend-production.up.railway.app/favicon.ico">
  <title>Email Template</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</head>

<body style="font-family: Arial, sans-serif; background-color: #f0f0f0; margin: 0; padding: 0;">
  <table align="center" cellpadding="0" cellspacing="0" border="0"
    style="width: 100%; max-width: 600px; background-color: #000; border: 0; overflow: hidden; margin: 0 auto; font-family: 'Roboto', sans-serif;">
    <tr>
      <td style="padding: 30px 15px; text-align: center;">
        <a href="#" style="text-align: center;">
          <img style="margin: 0 auto;" width="200px"
            src="https://converg-frontend-production.up.railway.app/logo.gif" alt="logo" />
        </a>
      </td>
    </tr>
    <tr>
      <td>
        <table role="presentation"
          style="border-collapse: collapse; border-spacing: 0; min-width: 200px; height: 35px;">
          <tbody>
            <tr>
              <td
                style="padding: 0 15px; background: #00d5fa; color: #000; border: 1px solid #000; border-left: 0; border-bottom: 0; box-shadow: inset 0 0 15px #00d5fa;">
                Chat ID - 123456
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
    <tr>
      <td
        style="background-color: #00d5fa; color: #000; font-weight: bold; padding: 10px 15px; border-top: 1px solid #000; border-bottom: 1px solid #000; box-shadow: inset 0 0 15px #00d5fa;">
        Visitor Information
      </td>
    </tr>
    <tr>
      <td style="padding: 15px;">
        <table width="100%" cellpadding="5" cellspacing="0" border="0">
          <tr>
            <td style="font-size: 14px; color: #fff; width: 50%; padding: 10px 0;">
              <div style="display: flex; align-items: center; gap: 7px;">
                <img src="https://res.cloudinary.com/djabtofcp/image/upload/v1721072268/Converg-Icons/b1zzzl6s0ijzi27rzfmf.png" width="18px" height="18px" style= "margin-right:8px;"
                  alt="envelope icon" />
                NA
              </div>
            </td>
            <td style="font-size: 14px; color: #fff; width: 50%; padding: 10px 0;">
              <div style="display: flex; align-items: center; gap: 7px;">
                <img
                  src="https://res.cloudinary.com/djabtofcp/image/upload/v1721072269/Converg-Icons/of80km9cjmszkiczd4iu.png"
                  width="18px" height="18px" style= "margin-right:8px;" alt="phone icon" />
                NA
              </div>
            </td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #fff; padding: 10px 0 0 0; display: flex; align-items: start; gap: 7px;">
              <img src="https://res.cloudinary.com/djabtofcp/image/upload/v1721072269/Converg-Icons/ipqphbll0abnlaikytbl.png" width="18px" height="18px" style= "margin-right:8px;"
                alt="location icon" />
              Philadelphia, Pennsylvania, United States
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td
        style="background-color: #00d5fa; color: #000; font-weight: bold; padding: 10px 15px; border-top: 1px solid #000; border-bottom: 1px solid #000; box-shadow: inset 0 0 15px #00d5fa;">
        Chat Information
      </td>
    </tr>
    <tr>
      <td style="padding: 15px;">
        <table width="100%" cellpadding="5" cellspacing="0" border="0">
          <tr>
            <td style="font-size: 14px; color: #fff; width: 50%; padding: 10px 0;">
              <div style="display: flex; gap: 8px; align-items: start;">
                <img src="https://res.cloudinary.com/djabtofcp/image/upload/v1721072270/Converg-Icons/iklkx3snjoo1pcvpouah.png" width="18px" height="18px" style= "margin-right:8px;"
                  alt="Website icon" />
                <div>
                  <p style="font-size: 14px; color: #00d5fa; margin: 0; font-weight: 600; margin-bottom: 5px;">Website</p>
                  <p style="font-size: 14px; color: #fff; margin: 0;">
                    <a href="http://capstonegreenenergy.com"
                      style="color: #fff; text-decoration: none;">capstonegreenenergy.com</a>
                  </p>
                </div>
              </div>
            </td>
            <td style="font-size: 14px; color: #fff; width: 50%; padding: 10px 0;">
              <div style="display: flex; gap: 8px; align-items: start;">
                <img src="https://res.cloudinary.com/djabtofcp/image/upload/v1721072269/Converg-Icons/vssqyppiwth4n12dlcne.png" width="18px" height="18px" style= "margin-right:8px;"
                  alt="clock icon" />
                <div>
                  <p style="font-size: 14px; color: #00d5fa; margin: 0; font-weight: 600; margin-bottom: 5px;">Time</p>
                  <p style="font-size: 14px; color: #fff; margin: 0;">13:45:57 PST</p>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #fff; width: 50%; padding: 10px 0;">
              <div style="display: flex; gap: 8px; align-items: start;">
                <img
                  src="https://res.cloudinary.com/djabtofcp/image/upload/v1721072269/Converg-Icons/yghlracqx4x72w8reqfd.png"
                  width="18px" height="18px" style= "margin-right:8px;" alt="person icon" />
                <div>
                  <p style="font-size: 14px; color: #00d5fa; margin: 0; font-weight: 600; margin-bottom: 5px;">Agent</p>
                  <p style="font-size: 14px; color: #fff; margin: 0;">Leon</p>
                </div>
              </div>
            </td>
            <td style="font-size: 14px; padding: 10px 0; color: #fff; width: 50%;">
              <div style="display: flex; gap: 8px; align-items: start;">
                <img src="https://res.cloudinary.com/djabtofcp/image/upload/v1721072269/Converg-Icons/szvpa3kxvtrbzamecem0.png" width="18px" height="18px" style= "margin-right:8px;"
                  alt="stop watch icon" />
                <div>
                  <p style="font-size: 14px; color: #00d5fa; margin: 0; font-weight: 600; margin-bottom: 5px;">Chat
                    Duration</p>
                  <p style="font-size: 14px; color: #fff; margin: 0;">8m 15s</p>
                </div>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td
        style="background-color: #00d5fa; color: #000; font-weight: bold; padding: 10px 15px; border-top: 1px solid #000; border-bottom: 1px solid #000; box-shadow: inset 0 0 15px #00d5fa;">
        Acquisition
      </td>
    </tr>
    <tr>
      <td style="padding: 15px;">
        <table width="100%" cellpadding="5" cellspacing="0" border="0">
          <tr>
            <td style="font-size: 14px; color: #fff; width: 50%; padding: 10px 0;">
              <div style="display: flex; gap: 8px; align-items: start;">
                <img src="https://res.cloudinary.com/djabtofcp/image/upload/v1721072269/Converg-Icons/fa6hpqeehksnu8p4xyni.png"
                  width="18px" height="18px" style= "margin-right:8px;" alt="world icon" />
                <div>
                  <p style="font-size: 14px; color: #00d5fa; margin: 0; font-weight: 600; margin-bottom: 5px;">Browser</p>
                  <p style="font-size: 14px; color: #fff; margin: 0;">Chrome 123.0</p>
                </div>
              </div>
            </td>
            <td style="font-size: 14px; color: #fff; width: 50%; padding: 10px 0;">
              <div style="display: flex; gap: 8px; align-items: start;">
                <img
                  src="https://res.cloudinary.com/djabtofcp/image/upload/v1721072270/Converg-Icons/pbymibnl5gknkeetdb4p.png"
                  width="18px" height="18px" style= "margin-right:8px;" alt="Id icon" />
                <div>
                  <p style="font-size: 14px; color: #00d5fa; margin: 0; font-weight: 600; margin-bottom: 5px;">Visitor ID
                  </p>
                  <p style="font-size: 14px; color: #fff; margin: 0;">53288004</p>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #fff; width: 50%; padding: 10px 0;">
              <div style="display: flex; gap: 8px; align-items: start;">
                <img
                  src="https://res.cloudinary.com/djabtofcp/image/upload/v1721072270/Converg-Icons/vc1kzsleffrhe8vcfrkg.png"
                  width="18px" height="18px" style= "margin-right:8px;" alt="computer icon" />
                <div>
                  <p style="font-size: 14px; color: #00d5fa; margin: 0; font-weight: 600; margin-bottom: 5px;">Device</p>
                  <p style="font-size: 14px; color: #fff; margin: 0;">Desktop</p>
                </div>
              </div>
            </td>
            <td style="font-size: 14px; padding: 10px 0; color: #fff; width: 50%;">
              <div style="display: flex; gap: 8px; align-items: start;">
                <img src="https://res.cloudinary.com/djabtofcp/image/upload/v1721072269/Converg-Icons/utbyexee7jqhkhccz9of.png" width="18px"
                  height="18px" style= "margin-right:8px;" alt="network icon" />
                <div>
                  <p style="font-size: 14px; color: #00d5fa; margin: 0; font-weight: 600; margin-bottom: 5px;">IP Address
                  </p>
                  <p style="font-size: 14px; color: #fff; margin: 0;">76.150.184.179</p>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #fff; width: 50%; padding: 10px 0;">
              <div style="display: flex; gap: 8px; align-items: start;">
                <img src="https://res.cloudinary.com/djabtofcp/image/upload/v1721072269/Converg-Icons/wuqgzyx7ruoaz1jco8aj.png" width="18px" height="18px" style= "margin-right:8px;"
                  alt="leaf icon" />
                <div>
                  <p style="font-size: 14px; color: #00d5fa; margin: 0; font-weight: 600; margin-bottom: 5px;">Lead Source
                  </p>
                  <p style="font-size: 14px; color: #fff; margin: 0;">Organic</p>
                </div>
              </div>
            </td>
            <td style="font-size: 14px; padding: 10px 0; color: #fff; width: 50%;">
              <div style="display: flex; gap: 8px; align-items: start;">
                <img src="https://res.cloudinary.com/djabtofcp/image/upload/v1721072269/Converg-Icons/gr1jnrqydpdy7kb1zxl1.png" width="18px"
                  height="18px" style= "margin-right:8px;" alt="chat icon" />
                <div>
                  <p style="font-size: 14px; color: #00d5fa; margin: 0; font-weight: 600; margin-bottom: 5px;">Chat Origin
                  </p>
                  <p style="font-size: 14px; color: #fff; margin: 0;">Website</p>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="font-size: 14px; color: #fff; width: 50%; padding: 10px 0;">
              <div style="display: flex; gap: 8px; align-items: start;">
                <img src="https://res.cloudinary.com/djabtofcp/image/upload/v1721072270/Converg-Icons/cqacuuhiol3ivha8bbmd.png" width="18px" height="18px" style= "margin-right:8px;"
                  alt="links icon" />
                <div>
                  <p style="font-size: 14px; color: #00d5fa; margin: 0; font-weight: 600; margin-bottom: 5px;">Referrer</p>
                  <p style="font-size: 14px; color: #fff; margin: 0;"><a href="https://www.bing.com/"
                      style="color: #fff; text-decoration: none;">https://www.bing.com/</a></p>
                </div>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td
        style="background-color: #00d5fa; color: #000; font-weight: bold; padding: 10px 15px; border-top: 1px solid #000; border-bottom: 1px solid #000; box-shadow: inset 0 0 15px #00d5fa;">
        Chat Transcript
      </td>
    </tr>
    <tr>
      <td style="padding: 15px;">
        <table width="100%" cellpadding="5" cellspacing="0" border="0" style="font-size: 14px; color: #fff;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff; padding-right: 10px;"><strong>Leon:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff; line-height: 24px;">Welcome to Capstone Green
              Energy! Please
              note that our chat conversations may be recorded and monitored
              for quality assurance and training purposes. By continuing with this chat, you consent to the recording of
              this conversation. How can I help you today?</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff; padding-right: 10px;">
              <strong>Visitor53288004:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff; line-height: 24px;">Is Capstone Green now - or
              soon to be listed on
              OTC?</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff; padding-right: 10px;"><strong>Leon:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff; line-height: 24px;">Let me see how I can help.
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff; padding-right: 10px;"><strong>Leon:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff; line-height: 24px;">Are you one of our existing
              customers or a new
              customer?</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff; padding-right: 10px;">
              <strong>Visitor53288004:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff; line-height: 24px;">Both</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff; padding-right: 10px;"><strong>Leon:</strong></td>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff; line-height: 24px;">To better enhance your
              experience, can you
              please provide your first and last name along with the
              company you represent?</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff; padding-right: 10px;">
              <strong>Visitor53288004:</strong>
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #fff; line-height: 24px;">I am a shareholder</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td
        style="background-color: #00d5fa; color: #000; font-weight: bold; padding: 30px 15px; border-top: 1px solid #000; box-shadow: inset 0 0 20px #00d5fa;">
        NOTE: This is a system generated email. Please do not reply.
      </td>
    </tr>
  </table>
</body>

</html>



   
   
    `;

    await sendViaSendGridApi({
        apiKey: smtpConfig.authPass,
        from,
        to: parseEmails(to),
        cc: parseEmails(cc),
        bcc: parseEmails(bcc),
        subject: 'Test Email',
        html: htmlTemplate,
    });
};

module.exports = sendTestEmail;
