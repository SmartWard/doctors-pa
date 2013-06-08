doctors-pa
==========

Open development of in patient task management application

This is a MongoDB and Node.js application using Socket.io and Express

To run it you have to have NodeJS and MongoDB installed on the machine.
Just extract it and run it like any other ExpressJS app (execute 'node app').
It will listen o port 3000 and will connect to the local MongoDB and create a "smart ward" namespace.

Before we start it we have to create some users.
With your favorite text editor open app.js and go to line 57 and 58.
These are the routes to the pages responsible for adding new users.
Remove the user.restrict_admin middleware calls so we can access the pages to create the first users.

The lines should look like this:
app.get('/admin/users/add', users.admin.add);
app.post('/admin/users/add', users.admin.add.post);

Start the app.
Go to /admin/users/add and create a few users of each type: administrators and regular ones.
Stop the app.

Restore the previous lines to their original state and start it again.
Log in with one of the administrator users. Create some wards and beds.
Log out.

Log with one of the regular users. Go to Patients -> Add (or /patients/add).
Add patients.
Browse around the app.