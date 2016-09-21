var unirest = require('unirest');
var express = require('express');
var events = require('events');

var getFromApi = function(endpoint, args) {
    var emitter = new events.EventEmitter();
    unirest.get('https://api.spotify.com/v1/' + endpoint)
        .qs(args)
        .end(function(response) {
            if (response.ok) {
                emitter.emit('end', response.body);
            }
            else {
                emitter.emit('error', response.code);
            }
        });
    return emitter;
};
var app = express();
app.use(express.static('public'));

app.get('/search/:name', function(req, res) {
    var searchReq = getFromApi('search', {
        q: req.params.name,
        limit: 1,
        type: 'artist'
    });
    
    

    searchReq.on('end', function(item) {
        var artist = item.artists.items[0];
    
        var relatedArtist = getFromApi('artists/' + artist.id + '/related-artists', {
            id: artist.id
        });
        var completedRequests = 0
        var checkComplete = function(){
            if (completedRequests === artist.related.length){
                res.json(artist)
            }
        }
        relatedArtist.on('end', function(relatedArtists) {
            artist.related = relatedArtists.artists
            artist.related.forEach(function(relatedArtist) {
                
                var topTracks = getFromApi('artists/' + relatedArtist.id + '/top-tracks?country=US', {
                    id: relatedArtist.id
                });

                topTracks.on('end', function(item) {
                    relatedArtist.tracks = item.tracks
                    completedRequests++
                    checkComplete();
                });
                

                topTracks.on('error', function(code) {
            
                    completedRequests++
                    checkComplete();
                });

            })
            
            
        });
        relatedArtist.on('error', function(code) {
            res.sendStatus(code);
        });
    });

    searchReq.on('error', function(code) {
        res.sendStatus(code);
    });

});



app.listen(process.env.PORT || 8080);
