// Create 3 particle system arrays globally
let particles_a = [];
let particles_b = [];
let particles_c = [];

// Create variables that will be used to visualize audioFeatures data
let num;
let fade;
let radius;
let noiseScale;
let noiseStrength;

// Variable to check if the system has been initialized
let systemInitialized = false; 

// Spotify API Variables
let token;
let audioFeatures;

// Personal Spotify API credentials
const client_id = 'ada3276e6b9f4b538ba1557c8697cd0a';
const client_secret = 'c8770d0da328409cb4fa45f10ee059ad';

// Spotify API Authorization (referenced:https://developer.spotify.com/documentation/web-api/tutorials/client-credentials-flow and modified for 'fetch' API)
const authOptions = {
    method: 'POST',
    headers: {
        'Authorization': 'Basic ' + btoa(client_id + ':' + client_secret),
        'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
};

function setup() {

    //connects to CSS parameters
    let cnv = createCanvas(1000, 500);
    cnv.parent('canvasContainer');

    background(0);
    noStroke();

    // Fetch Spotify access token (referenced:https://developer.spotify.com/documentation/web-api/tutorials/client-credentials-flow and modified for 'fetch' API)
    fetch('https://accounts.spotify.com/api/token', authOptions)
        .then(response => response.json())
        .then(data => {
            token = data.access_token;
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function setupParticles() {

    // Initializes particle setup only if audio features are available
    if (!audioFeatures) {
        return;
    }

    // Resets the particles array everytime a new track has been inputted
    particles_a = [];
    particles_b = [];
    particles_c = [];
    
    // Selected audio features to be visualized (energy, duration_ms, loudness, danceability, and tempo)
    num = map(audioFeatures.energy, 0, 1, 500, 2000);
    fade = map(audioFeatures.duration_ms, 0, 360000, 50, 150);
    radius = map(audioFeatures.loudness, -60, 0, 1, 5);
    noiseScale = map(audioFeatures.danceability, 0, 1, 200, 400);
    noiseStrength = map(audioFeatures.tempo, 60, 180, 0.5, 2);


    // Creates 3 particle objects at random places and maps the speed based on the energy of the audio track
    for (let i = 0; i < num; i++) {
        particles_a[i] = new Particle(random(width), random(height), map(audioFeatures.energy, 0, 1, 0.05, 3));
        particles_b[i] = new Particle(random(width), random(height), map(audioFeatures.energy, 0, 1, 0.05, 3));
        particles_c[i] = new Particle(random(width), random(height), map(audioFeatures.energy, 0, 1, 0.05, 3));
    }

    systemInitialized = true; 
}

function draw() {
    
    // Particles are only drawn if the system has been initialized
    if (!systemInitialized) {
        return;
    }

    // Fading effect referenced from (https://openprocessing.org/sketch/1990191)
    fill(0, 5);
    rect(0, 0, width, height);

    // Uses HSB color mode for more vibrant colors
    colorMode(HSB);

    // Maps different audio features to color components
    let baseHue = map(audioFeatures.valence, 0, 1, 0, 360); // Base hue from valence
    let saturationA = map(audioFeatures.energy, 0, 1, 50, 100); // Saturation from energy
    let brightnessB = map(audioFeatures.danceability, 0, 1, 50, 100); // Brightness from danceability

    // Creates distinct colors for each particle system
    let colorA = color(baseHue, saturationA, 90); // Color A is influenced by valence and energy
    let colorB = color((baseHue + 120) % 360, 80, brightnessB); // Color B is influenced by hue shift and danceability
    let colorC = color((baseHue + 240) % 360, 70, 80); // Color C is influenced by another hue shift

    for (let i = 0; i < num; i++) {
        fill(colorA);
        particles_a[i].move();
        particles_a[i].update(radius);
        particles_a[i].checkEdges();

        fill(colorB);
        particles_b[i].move();
        particles_b[i].update(radius);
        particles_b[i].checkEdges();

        fill(colorC);
        particles_c[i].move();
        particles_c[i].update(radius);
        particles_c[i].checkEdges();
    }

    colorMode(RGB);
}

// Particle class referenced from (https://openprocessing.org/sketch/1990191)
// Moves, checks edges, and updates position
class Particle {
    constructor(loc_x, loc_y, speed_) {
        this.loc = createVector(loc_x, loc_y);
        this.speed = speed_;
        this.angle = 0;
        this.dir = createVector(cos(this.angle), sin(this.angle));
    }

    move() {
        this.angle = noise(this.loc.x / noiseScale, this.loc.y / noiseScale, frameCount / noiseScale) * TWO_PI * noiseStrength;
        this.dir.x = cos(this.angle);
        this.dir.y = sin(this.angle);
        this.vel = this.dir.copy();
        this.vel.mult(this.speed);
        this.loc.add(this.vel);
    }

    checkEdges() {
        if (this.loc.x < 0 || this.loc.x > width || this.loc.y < 0 || this.loc.y > height) {
            this.loc.x = random(width * 1.2);
            this.loc.y = random(height);
        }
    }

    update(r) {
        ellipse(this.loc.x, this.loc.y, r, r);
    }
}

// Async functionality, try/catch, referenced from Coding Train Promises Playlist (https://www.youtube.com/playlist?list=PLRqwX-V7Uu6bKLPQvPRNNE65kBL62mVfx)

// Searches for song from user input by calling spotify API and fetches track ID info
async function searchSong() {
    try {
        const songName = document.getElementById('songInput').value;
        const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(songName)}&type=track`;

        const trackData = await fetch(searchUrl, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token }
        }).then(response => response.json());

        const trackId = trackData.tracks.items[0].id;
        await fetchAudioFeatures(trackId);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Fetches audio features for searched song
async function fetchAudioFeatures(trackId) {
    const audioFeaturesUrl = `https://api.spotify.com/v1/audio-features/${trackId}`;
    const audioFeaturesData = await fetch(audioFeaturesUrl, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
    }).then(response => response.json());

    audioFeatures = audioFeaturesData;

    //prints audio features in the console
    console.log("Audio Features:", audioFeatures);
    
    //clears canvas then calls setupParticles to initialize particles 
    clear();
    setupParticles();
}

// Searches suggestions when user types in at least 3 words of a song name
async function searchSuggestions() {
    let songName = document.getElementById('songInput').value;
    if (songName.length < 3) {
        document.getElementById('suggestionBox').innerHTML = '';
        return;
    }

    try {
        const tracks = await fetchTracks(songName);
        displaySuggestions(tracks);
    } catch (error) {
        console.error('Error:', error);
    }
}

// fetches songs from Spotify API for search suggestion box
async function fetchTracks(songName) {
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(songName)}&type=track&limit=5`;

    try {
        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token }
        });

        const data = await response.json();
        return data.tracks.items;
    } catch (error) {
        console.error('Error:', error);
    }
}

// Function displays suggested album image and track name
// Referenced Coding Train HTML/CSS/DOM (https://www.youtube.com/playlist?list=PLRqwX-V7Uu6bI1SlcCRfLH79HZrFAtBvX)
// Referenced (https://p5js.org/reference/#/p5/createDiv)
// Referenced (https://p5js.org/reference/#/p5.Element/addClass)
// Referenced (https://p5js.org/reference/#/p5.Element/child)
function displaySuggestions(tracks) {

    //clears displayed suggestions
    select('#suggestionBox').html('');
    
    for (let i = 0; i < tracks.length; i++) {
        let track = tracks[i];
    
            // Creates a section for each track
            let trackDiv = createDiv('').addClass('track-suggestion');
    
            // Displays album of song info
            let albumArt = createImg(track.album.images[0].url, 'Album Art').addClass('album-art');
            trackDiv.child(albumArt);
    
            // Displays song info
            let trackInfo = createDiv(`${track.name} - ${track.artists.map(artist => artist.name).join(', ')}`);
            trackDiv.child(trackInfo);
    
            // Set up the click event for when suggestion is correctly clicked
            trackDiv.mousePressed(() => {
                select('#songInput').value(track.name);
                select('#suggestionBox').html('');
   
            });
    
            // Appends the track div to the suggestion box
            select('#suggestionBox').child(trackDiv);
        }
    }
    
  



