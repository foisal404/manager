const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()

const port = process.env.PORT || 5000;


//middleware
// app.use(cors())
app.use(cors({
    origin: 'http://localhost:5173', // Allow requests from this origin
}));
const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
}
app.use(cors(corsOptions))

// app.use(express.json())


// dB Connection

const url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.pxrxjz6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(url, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const postCollection = client.db("deltamanaher").collection("allposts");
        const draftCollection = client.db("deltamanaher").collection("drafts");

        //Posts
        app.get('/posts', async (req, res) => {
            const result = await postCollection.find().toArray()
            res.send(result)
        })
        app.get('/drafts', async (req, res) => {
            const result = await draftCollection.find().toArray()
            res.send(result)
        })

        app.post('/post', async (req, res) => {
            try {
                const data = req.body;
                const { title } = data;

                if (!title) {
                    return res.status(400).send({ error: "Title is required" });
                }

                console.log("Received data:", data);

                // Check if the title exists in draftCollection
                const draft = await draftCollection.findOne({ title });

                if (draft) {
                    console.log("Title found in draftCollection, removing it...");
                    await draftCollection.deleteOne({ _id: draft._id });
                }

                // Insert the data into postCollection
                const insertResult = await postCollection.insertOne(data);
                console.log("Data inserted into postCollection:", insertResult);

                res.send({ message: "Data posted successfully", insertResult });
            } catch (error) {
                console.error("Error in /post route:", error);
                res.status(500).send({ error: "An error occurred while processing your request" });
            }
        });

        app.post('/draft', async (req, res) => {
            try {
                const data = req.body;
                const title = data.title;
                const result = await draftCollection.updateOne(
                    { title: title }, // Filter to find the document by title
                    { $set: data }, // Update or insert the data
                    { upsert: true } // Create a new document if no document matches
                );

                if (result.upsertedCount > 0) {
                    res.send({ message: "New draft created", upsertedId: result.upsertedId });
                } else if (result.modifiedCount > 0) {
                    res.send({ message: "Draft updated" });
                } else {
                    res.send({ message: "No changes made" });
                }
            } catch (error) {
                console.error("Error handling draft:", error);
                res.status(500).send({ error: "An error occurred while processing the request" });
            }
        });
        app.delete('/draft/:id', async (req, res) => {
            const id = req.params.id;
            const result = await draftCollection.deleteOne({ _id: new ObjectId(id) });
            res.send(result);


        });


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
