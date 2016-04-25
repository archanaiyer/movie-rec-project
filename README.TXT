Setup
Local
1. To get the system up and running on a local Mac you will primarily need to do the following:
2. Clone the movie-rec-app and movie-rec-project
3. Install node.js: https://nodejs.org/en/
    Install MongoDB: https://docs.mongodb.org/manual/tutorial/install-mongodb-on-os-x/
For step 3 do:
sudo chmod 777 /data/db

 Possibly install Robomongo to have a GUI for MongoDB: http://robomongo.org/
4. To run the Python scripts you will likely need to install additional modules via pip: https://pip.pypa.io/en/stable/installing/

5. Start mongodb 
6. First edit the location of movies.dat file in the loadmongo.py file
Run loadmongo.py from movie-rec-scripts/dbloader to load movies and links to tmdb.

7. Run rec-finder.py from movie-rec-scripts/rec to load recommendations.

8. Run update-service.py to monitor the database for changes and call function that updates the model accordingly.

9. Create a TMDB account and insert the tmdb key in routes/index.js

10. Go to movie-rec-app and run “npm install”
Then run “node app.js” (or nodejs app.js)  and visit http://localhost:3000/

To run in background (on server) use “nohup app.js &”


To delete a collection in MongoDB:
shell: mongo
> use news
> db.recommendations.drop()


