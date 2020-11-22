const puppeteer = require('puppeteer');
const fs = require('fs');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const SESSION_FILE_PATH = './session.json';
const SCHEDULE_FILE_PATH = './schedules.json'

let sessionData;

setInterval(() => getData(), 1000 * 60 * 60 * 24);
getData()

if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionData = require(SESSION_FILE_PATH);
}
const client = new Client({
    session: sessionData,
});

client.on('authenticated', (session) => {
    sessionData = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function(err) {
        if (err) {
            console.error(err);
        }
    });
});
client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    console.log('QR RECEIVED');
    qrcode.generate(qr, {
        small: true
    });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', msg => {
    console.log("Message Received, Content => ", msg.body);
    
    if (msg.body == '/schedule') {
        const scheduleFile = fs.readFileSync(SCHEDULE_FILE_PATH,'utf8')
        schedulesData =  JSON.parse(scheduleFile)

        let newMessage = 'Jadwal Kelas LE01\n\n';
        schedulesData.forEach(col => {
            newMessage += `Matkul: ${col[6]}\nTanggal: ${col[0]}\nWaktu: ${col[1]}\nTipe: ${col[5]}\n\n`;
        });
        msg.reply(newMessage)
    }
});

client.initialize();


async function getData()  {
    console.log("Fetching data..")
    const browser = await puppeteer.launch({headless:true,args: ['--no-sandbox']});
    const page = await browser.newPage();

    await page.goto('https://myclass.apps.binus.ac.id/Auth')

    // Input username and password
    const usernameEl = await page.type('#Username',"") // Insert Your Username
    const passwordEl = await page.type('#Password',"") // Insert Your Password

    // Submit form
    await page.click('#btnSubmit');
    await page.waitForNavigation();

    // Check if error
    await page.waitForSelector('#login_error', {
        visible: true,
        timeout: 1000
    })
    .then((el) => console.log("Login Failed"))
    .catch((err) => console.log("Login Success"));

      
    // Get Schedule Data
    const result = await page.$$eval("#studentViconList tbody tr", rows => {
        return Array.from(rows, row => {
            const columns = row.querySelectorAll('td');
            return Array.from(columns, column => column.innerText)
        })
        
    })

    result.splice(0,2)
    

    fs.writeFile(SCHEDULE_FILE_PATH, JSON.stringify(result), function(err) {
        if (err) {
            console.error(err);
        }
    });

    browser.close();
}

