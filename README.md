# The Amorphic Framework

*Shamelessly copied and pasted from [here](https://medium.com/haven-life/an-introduction-to-the-isomorphic-paradigm-using-amorphic-b7a8071ca11f)*

### Background

At Haven Life, we frequently create new applications from scratch to solve for a variety of problem sets. There are many known advantages to using separate services and applications to accomplish specific tasks, but there are also a few pain points. For example:

- Boilerplate Database queries. Basic CRUD (Create, Read, Update, Delete) operations and schema modifications that happen frequently with early stage applications require costly and error prone migration scripts.
- Marshaling (packaging and sending data) the data across the wire.
- Making sure the app deserializes the data correctly according to the object model contract.
- Synchronizing our object graph with our database schema / data models.

To solve for these challenges we build and maintain a framework called Amorphic.
What is the Amorphic Framework?

The Amorphic Framework is an Isomorphic JavaScript framework that uses Node.js.

Isomorphism means:

- The same code lives on both the client and the server.
- Defined functions can be shared to both the client and the server.
- Shared function can be run on both the client and the server.

### Amorphic Components

- *Amorphic* itself is an express-based web server that delegates requests to the framework’s three subcomponents including:

- *Supertype* — Injects a class based type system for JavaScript objects. You can think of Supertype as a normal JavaScript object, but with some public convenience functionality (such as serialization/deserialization) which initializes the private properties that the framework uses internally to keep track of objects.

- *Persistor* — An Object-Relational Mapper (ORM). Persistor abstracts away the most basic database operations, can handle schema changes, and helps with migrations. It has an intimate knowledge of your objects’ relations.

- *Semotus* — Semotus synchronizes data across the two sets of JavaScript objects; one of which lives on the client, and one which lives on the server. Semotus also manages the session state in the application.

The underlying paradigm of Amorphic is that all layers of your application are speaking the same language; in other words, all layers are operating on the same set of data models. Your models in the browser mirror your object models on the server, and your object models on the server mirror your data models in the database. The purpose of the subcomponents of Amorphic is to bridge the gap at each point where these communications and synchronizations need to happen.
Check out the above link for a diagram explaining how!

All of these subcomponents have their own READMEs so check them out to get started!

### Why we use Amorphic at Haven Life

#### Advantages:

- Ease of development
- Mirroring models from the front end to the database creates high transparency between all layers, and reasoning about operations and data changes results in a simpler architecture.
- Speed of development / Time to Market
- When following the Amorphic conventions, developers can quickly make changes and create new features without worrying about boilerplate code.
- Consistency of architecture
- We can easily replicate Amorphic’s structure across applications, and it’s simple for a developer to bootstrap a brand new Amorphic app.
- Amorphic also has an additional “daemon mode” for server side only applications that also follow similar conventions (and utilize the same subcomponents), this allows familiarity and consistency when developing those apps as well. Daemon mode will be a topic in a future blog post.

#### Caveats:

- ORM queries are best for boilerplate operations. If you want to create more complex queries, the ORM will not replace raw SQL in terms of performance. To that end, Persistor exposes a handler for the underlying database connection that developers can use to write their own raw queries.

### Amorphic for your use case

#### When to use Amorphic:

- Customer facing applications. For example, session based applications that have browser elements to them or that utilize complex forms. (ex. a traditional CRUD web application).
- Building an application from scratch, such as proof of concept type applications.
- Object oriented applications that have dense object graphs, and a high degree of relationships and reusable components.

#### When to consider other options:

- Extreme high performance applications where performance is a priority over ease of development.
- As with most things, using the tool that works until it stops working is a good rule to follow. If you find yourself running functional ETL jobs, or needing to heavily optimize memory consumption on the server side, there are other tools that might fit those needs better.
- A front end only application / a static website that may not require much or any data persistence at all.