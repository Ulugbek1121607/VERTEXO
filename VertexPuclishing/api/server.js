const express = require('express');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Vercel environment variable
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("MongoDB URI is missing. Set the MONGODB_URI environment variable.");
    process.exit(1);
}

const client = new MongoClient(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

async function run() {
    try {
        await client.connect();
        console.log("Connected successfully to MongoDB");

        const db = client.db("vertex"); // Replace with your database name
        const usersCollection = db.collection("users"); // Replace with your collection name

        app.use(express.json());

        // Ensure files directory exists
        const filesDir = path.join(__dirname, 'journals', 'files');
        if (!fs.existsSync(filesDir)) {
            fs.mkdirSync(filesDir, { recursive: true });
        }

        // Set up storage for multer
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                if (file.fieldname === 'imageFile') {
                    cb(null, path.join(__dirname, 'journals', 'images'));
                } else if (file.fieldname === 'fileFile') {
                    cb(null, path.join(__dirname, 'journals', 'files'));
                }
            },
            filename: (req, file, cb) => {
                const uniqueName = uuidv4() + path.extname(file.originalname);
                cb(null, uniqueName);
            }
        });

        const upload = multer({ storage: storage });

        app.use(express.json({ limit: '200mb' }));
        app.use(express.urlencoded({ limit: '200mb', extended: true }));
        app.use(express.static(__dirname)); // Serve static files from the root directory
        app.use('/login', express.static(path.join(__dirname, 'login'))); // Serve static files from the login directory

        // Serve main page
        // app.get('/', (req, res) => {
        //     res.sendFile(path.join(__dirname, 'main.html'));
        // });

        app.get('/main2.html', (req, res) => {
            res.sendFile(path.join(__dirname, 'main2.html'));
        });

        app.post('/register', async (req, res) => {
            const userData = req.body;

            try {
                const existingUser = await usersCollection.findOne({
                    $or: [{ email: userData.email }, { username: userData.username }],
                });

                if (existingUser) {
                    return res.status(400).json({ message: 'User already registered' });
                }

                const hashedPassword = await bcrypt.hash(userData.password, 10);

                const newUser = {
                    ...userData,
                    password: hashedPassword,
                };

                const result = await usersCollection.insertOne(newUser);
                console.log(`New user created with id: ${result.insertedId}`);
                res.status(201).json({ message: 'User registered successfully' });

            } catch (err) {
                console.error("Error during registration:", err);
                res.status(500).json({ message: 'Failed to register user' });
            }
        });

        app.post('/login', async (req, res) => {
            const loginData = req.body;

            try {
                const user = await usersCollection.findOne({
                    $or: [{ email: loginData.email }, { username: loginData.username }],
                });

                if (!user) {
                    return res.status(401).json({ message: 'Invalid credentials' });
                }

                const passwordMatch = await bcrypt.compare(loginData.password, user.password);

                if (!passwordMatch) {
                    return res.status(401).json({ message: 'Invalid credentials' });
                }

                res.status(200).json({ message: 'Login successful', user });

            } catch (err) {
                console.error("Error during login:", err);
                res.status(500).json({ message: 'Failed to login' });
            }
        });

        // Serve main2.html after successful registration or login
        app.get('/main2.html', (req, res) => {
            res.sendFile(path.join(__dirname, 'main2.html'));
        });

        // New Endpoint - Upload Admin Journal
        app.post('/uploadAdminJournal', upload.fields([{ name: 'imageFile', maxCount: 1 }, { name: 'fileFile', maxCount: 1 }]), (req, res) => {
            const journalId = uuidv4(); // Generate a unique ID for the journal
            const imageFile = req.files['imageFile'][0];
            const fileFile = req.files['fileFile'][0];

            const journal = {
                id: journalId,
                journalName: req.body.journalName,
                description: req.body.description,
                issn: req.body.issn,
                imagePath: path.join('journals', 'images', imageFile.filename),
                filePath: path.join('journals', 'files', fileFile.filename),
                publishedAt: new Date().toISOString()
            };
            const filePath = path.join(__dirname, 'journals', 'adminadd.json');

            fs.readFile(filePath, 'utf8', (err, data) => {
                let journals = [];
                if (!err) {
                    try {
                        if (data) {
                            journals = JSON.parse(data);
                        }
                    } catch (parseErr) {
                        console.error('Error parsing admin journals', parseErr);
                        return res.status(500).json({ success: false, message: 'Error parsing journal data' });
                    }
                } else if (err.code !== 'ENOENT') {
                    console.error('Error reading admin journals file', err);
                    return res.status(500).json({ success: false, message: 'Error reading journal data' });
                }

                journals.push(journal);
                fs.writeFile(filePath, JSON.stringify(journals, null, 2), (err) => {
                    if (err) {
                        console.error('Error writing admin journals file', err);
                        return res.status(500).json({ success: false, message: 'Error writing to file' });
                    }
                    // Respond with JSON true
                    res.json({ success: true, message: 'Journal published successfully!' });
                });
            });
        });

        // Serve static files from the 'public' directory
        app.use(express.static(path.join(__dirname, 'public')));
        app.use('/login', express.static(path.join(__dirname, 'public', 'login')));

        // Start the server
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });

    } catch (e) {
        console.error("Failed to connect to MongoDB", e);
        process.exit(1);
    }
}

run().catch(console.dir);
