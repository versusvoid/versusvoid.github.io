function get_random_color()
{
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++)
    {
        color += letters[Math.round(Math.random() * 15)];
    }
    return color;
}

var idToIndex = {};
var vertexies = new Array();

var trafficColors = [
    {
        color: "#000000"
    },
    {
        color: "#00FF00"
    },
    {
        color: "#33FF00"
    },
    {
        color: "#66FF00"
    },
    {
        color: "#99FF00"
    },
    {
        color: "#CCFF00"
    },
    {
        color: "#FFFF00"
    },
    {
        color: "#FFCC00"
    },
    {
        color: "#FF9900"
    },
    {
        color: "#FF6600"
    },
    {
        color: "#FF3300"
    },
    {
        color: "#FF0000"
    }
];

var map;

var popup = L.popup();

function onMapClick(e)
{
    popup
        .setLatLng(e.latlng)
        .setContent("You clicked the map at " + e.latlng.toString())
        .openOn(map);
}

function initMap()
{
    var apiKey = '460a360c630e43849b9f1ede2511e713';

    map = L.map('map')
        .setView([59.96231, 30.30836], 13);
    L.tileLayer('http://{s}.tile.cloudmade.com/' + apiKey + '/999/256/{z}/{x}/{y}.png',
    {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
        maxZoom: 18
    })
        .addTo(map);

    /*
    var polyline = L.polyline([new L.LatLng(59.91, 30.304), new L.LatLng(59.941, 30.314031)],
    {
        color: 'red',
        opacity: 1
    })
        .addTo(map);

    setTimeout(function ()
    {
        polyline.setStyle(
        {
            color: 'green',
            opactity: 1
        });
    }, 5000);
    var polygon = L.polygon([
    [59.96575, 30.23369],
     [59.96506, 30.27420],
     [59.96747, 30.28090],
     [59.97228, 30.28467],
     [59.98038, 30.31467],
     [59.97623, 30.32656],
     [59.96996, 30.33411],
     [59.95346, 30.34012],
     [59.94532, 30.30446],
     [59.96326, 30.23403]
    ])
        .addTo(map);

    map.fitBounds(polygon.getBounds());
    */

    map.on('click', onMapClick);

    $.getJSON('ways.json', onMapLoaded);
}

var scale = 10000;
function distance(p1, p2)
{
    var x = p1.lat*scale - p2.lat*scale;
    var y = p1.lon*scale - p2.lon*scale;
    return Math.sqrt(x*x + y*y);
}

function onMapLoaded(json)
{
    var ways = {};
    for (var i = 0; i < json.elements.length; i++)
    {
        if (json.elements[i].type === "way")
        {
            ways[json.elements[i].id] = json.elements[i];
        }
        else if (json.elements[i].type === "node")
        {
            idToIndex[json.elements[i].id] = vertexies.length;
            vertexies[vertexies.length] = json.elements[i];
            delete vertexies[vertexies.length - 1]['type']; // потому что не нужен
            delete vertexies[vertexies.length - 1]['id']; // потому что не нужен
            vertexies[vertexies.length - 1].edges = new Array();
        }
    }

    for (wayId in ways)
    {
        var way = ways[wayId];
        var isOneWay = way['tags']['oneway'] === 'yes';
        for (var i = 0; i < way.nodes.length - 1; i++)
        {
            if (way.nodes[i] in idToIndex &&
                way.nodes[i + 1] in idToIndex)
            {
                var v1id = idToIndex[way.nodes[i]];
                var v1 = vertexies[v1id];
                var v2id = idToIndex[way.nodes[i + 1]];
                var v2 = vertexies[v2id];
                var points = [new L.LatLng(v1.lat, v1.lon), new L.LatLng(v2.lat, v2.lon)];
                var polyline = L.polyline(points,
                {
                    color: trafficColors[1].color,
                    opacity: 0.75
                })
                    .addTo(map);

                var edge = {
                    v1: Math.min(v1id, v2id),
                    v2: Math.max(v1id, v2id),
                    load: 1,
                    length: distance(v1, v2),
                    line: polyline,
                    ver: 0
                };

                polyline.on('click', function (inV1Id, inV2Id, isBidirect)
                {
                    return (function (e)
                    {
                        console.log("Click on edge from " + inV1Id + " to " + inV2Id + (isBidirect?" bidirect":" directed"));
                        edgeClicked(e, inV1Id, inV2Id);
                    });
                }(edge.v1, edge.v2, isOneWay));

                v1.edges.push(edge);
//                            if( !isOneWay )
                {
                    v2.edges.push(edge);
                }
            }
            else
            {
                console.warn(way);
                console.warn(way.nodes[i]);
                console.warn(way.nodes[i + 1]);
            }
        }
    }

    /*
    var count = 0;
    for (var j = 0; j < json.elements.length && count < 10000; count++)
    {
        var nodes = new Array();
        var baseJ = j;
        for (var i = 0; json.elements[j].type === "node" && i < 100000; i++, j++)
        {
            nodes[i] = json.elements[j].id;
        }

        var points = new Array();
        for (var i = 0; i < json.elements[j].nodes.length; i++)
        {
            for (var k = 0; k < nodes.length; k++)
            {
                if (json.elements[j].nodes[i] == nodes[k])
                {
                    points[i] = new L.LatLng(json.elements[baseJ + k].lat, json.elements[baseJ + k].lon);
                    break;
                }
            }
        }

        var polyline = L.polyline(points,
        {
            color: get_random_color(),
            opacity: 0.75
        })
            .addTo(map);

        polyline.on('click', function (inJ)
        {
            return (function ()
            {
                console.log(json.elements[inJ]);
            });
        }(j));

        while (j < json.elements.length && json.elements[j].type !== "node")
            j++;
    }
    console.log(count + " ways");
    */
}

var startIcon = L.icon({
    iconUrl: 'images/start-marker.png',
    iconSize: [32, 37],
    iconAnchor: [15, 34],
    popupAnchor: [0, 0],
});

var endIcon = L.icon({
    iconUrl: 'images/end-marker.png',
    iconSize: [32, 37],
    iconAnchor: [15, 34],
    popupAnchor: [0, 0],
});

var path = 
    {
        source: null, 
        selectingSource: false, 
        
        dest: null, 
        selectingDest: false, 
        
        vertexies: null,
        line: null};

function clearPath()
{
    if( path.source.marker !== null )
    {
        map.removeLayer(path.source.marker);
        delete path.source.marker;
    }
    path.source = { marker: null, edge: null };

    if( path.dest.marker !== null )
    {
        map.removeLayer(path.dest.marker);
        delete path.dest.marker;
    }
    path.dest = { marker: null, edge: null };

    path.vertexies = null;
    
    if( path.line !== null )
    {
        map.removeLayer(path.line);
        delete path.line;
        path.line = null;
    }
}

function selectSource()
{
    path.selectingSource = true;
    path.selectingDest = false;
}
function selectDest()
{
    path.selectingDest = true;
    path.selectingSource = false;
}
function edgeClicked(e, v1id, v2id)
{
    if( path.selectingSource )
    {
        if( path.source != null )
        {
            map.removeLayer(path.source.marker);
            delete path.source.marker;
        }
        path.source = {marker: null, edge: null};

/*
        if( isBidirect )
        {
            var x1 = vertexies[v1id].lat - e.latlng.lat;
            var y1 = vertexies[v1id].lon - e.latlng.lon;
            var x2 = vertexies[v2id].lat - e.latlng.lat;
            var y2 = vertexies[v2id].lon - e.latlng.lon;
            if( x1*x1 + y1*y1 < x2*x2 + y2*y2 )
            {
                path.source.edge = {v1: v1id, v2: v2id};
            }
            else
            {
                path.source.edge = {v1: v2id, v2: v1id};
            }
        }
        else
*/
        {
            path.source.edge = {v1: v1id, v2: v2id};
        }
        path.source.marker = 
            new L.Marker(
                new L.LatLng(e.latlng.lat, e.latlng.lng), 
                {
                    title: "Start point",
                    icon: startIcon
                }
            ).addTo(map);
        path.selectingSource = false;
    }
    else if( path.selectingDest )
    {
        if( path.dest != null )
        {
            map.removeLayer(path.dest.marker);
            delete path.dest.marker;
        }
        path.dest = {marker: null, edge: null};
/*        
        if( isBidirect )
        {
            var x1 = vertexies[v1id].lat - e.latlng.lat;
            var y1 = vertexies[v1id].lon - e.latlng.lon;
            var x2 = vertexies[v2id].lat - e.latlng.lat;
            var y2 = vertexies[v2id].lon - e.latlng.lon;
            if( x1*x1 + y1*y1 < x2*x2 + y2*y2 )
            {
                path.dest.edge = {v1: v1id, v2: v2id};
            }
            else
            {
                path.dest.edge = {v1: v2id, v2: v1id};
            }
        }
        else
*/
        {
            path.dest.edge = {v1: v1id, v2: v2id};
        }
        path.dest.marker =
            new L.Marker(
                new L.LatLng(e.latlng.lat, e.latlng.lng), 
                {
                    title: "End point",
                    icon: endIcon
                }
            ).addTo(map);
        path.selectingDest = false;
    }
    else
    {
        popup
            .setLatLng(e.latlng)
            .setContent(v1id + " to " + v2id + " " + getEdge(v1id, v2id).length)
            .openOn(map);

        return;
    }

    if( path.line !== null )
    {
        map.removeLayer(path.line);
        delete path.line;
        path.line = null;
    }

    if( path.source !== null && path.dest !== null )
    {
        setTimeout(findPath, 100);
    }
}

var updatingMutex = false;

function findPath()
{
    if( path.source === null || path.dest === null )
        return;

    if( updatingMutex )
    {
        startTimeout(findPath, 100);
        return;
    }

    updatingMutex = true;

    console.log("Prepare stage");

    var currentVertex = path.source.edge.v1;
    var unvisited = new Array();
    var lengthes = new Array(vertexies.length);
    for(var i = 0; i < lengthes.length; i++)
    {
        unvisited.push(i);
        lengthes[i] = {from: -1, len: Number.POSITIVE_INFINITY};
    }

    lengthes[currentVertex] = {from: -1, len: 0};

    console.log("Stage one");
//    while( unvisited.length > 0 )
    while( currentVertex !== -1 )
    {
        for( var j = 0; j < vertexies[currentVertex].edges.length; j++ )
        {
            var edge = vertexies[currentVertex].edges[j];
            var weight = edge.length*edge.load;
                
            var otherVertex = (currentVertex === edge.v1 ? edge.v2 : edge.v1);
                
            if( lengthes[currentVertex].len + weight < lengthes[otherVertex].len )
            {
                lengthes[otherVertex] = 
                    {
                        from: currentVertex, 
                        len: lengthes[currentVertex].len + weight
                    };
            }
        }
        
        unvisited.splice(unvisited.indexOf(currentVertex), 1);        

        var minLen = Number.POSITIVE_INFINITY;
        currentVertex = -1;
        for( var i = 0; i < unvisited.length; i++ )
        {
            if( lengthes[unvisited[i]].len < minLen )
            {
                minLen = lengthes[unvisited[i]].len; 
                currentVertex = unvisited[i];
            }
        }
    }

    if( lengthes[path.dest.edge.v1].from === -1 )
    {
        alert("No way!");
        console.log("No way!");
        return;
    }
    
    console.log("Stage two");

    var pathNodes = [path.dest.edge.v1];
    console.log(path.dest.edge.v1);
    var pathPoints = [new L.LatLng(vertexies[path.dest.edge.v1].lat, vertexies[path.dest.edge.v1].lon)];
    do {
        if( lengthes[pathNodes[0]].from === -1 )
        {
            alert("No way!!");
            console.log(pathNodes[0]);
            return;
        }
        pathNodes.unshift(lengthes[pathNodes[0]].from);
        pathPoints.unshift(
            new L.LatLng(
                vertexies[pathNodes[0]].lat, 
                vertexies[pathNodes[0]].lon));
    }
    while( pathNodes[0] !== path.source.edge.v1 && pathNodes.length < 3000 );

    if( path.line !== null )
    {
        map.removeLayer(path.line);
        delete path.line;
        path.line = null;
    }

    if( pathNodes[1] === path.source.edge.v2 )
    {
       pathNodes.shift();
       pathPoints.shift();
    }

    if( pathNodes[pathNodes.length - 2] === path.dest.edge.v2 )
    {
        pathNodes.pop();
        pathPoints.pop();
    }
    
    path.vertexies = pathNodes;
    
    pathPoints.unshift(path.source.marker.getLatLng());
    pathPoints.push(path.dest.marker.getLatLng());

    path.line = 
        L.polyline(pathPoints,
        {
            color: '#660099',
            opacity: 0.75
        }).addTo(map);

    updatingMutex = false;
}

function getEdge(v1, v2)
{
    for( var i = 0; i < vertexies[v1].edges.length; i++ )
    {
        if( vertexies[v1].edges[i].v1 === v2 || 
                vertexies[v1].edges[i].v2 === v2 )
        {
            return vertexies[v1].edges[i];
        }
    }
    
    return null;
}

var speed = 600;
function advancePath()
{
    if( updatingMutex )
    {
        setTimeout(advancePath, 100);
        return;
    }

    if( path.line === null )
    {
        return;
    }

    updatingMutex = true;

    var latLngs = path.line.getLatLngs();
    var advancedDistance = 0;
    var nextDistance = distance(latLngs[0], latLngs[1])*
                         getEdge(path.nodes[0], path.nodes[1]).load;
    while( latLngs.length > 1 && 
             advancedDistance + nextDistance < speed )
    {
        latLngs.shift(); 
        path.nodes.shift();
        if( latLngs.length > 1 )
        {
            nextDistance = distance(latLngs[0], latLngs[1])*
                             getEdge(path.nodes[0], path.nodes[1]).load;
        }
    }

    if( latLngs.length < 2 )
    {
        
    }

        
    updatingMutex = false;
}

var timeoutId;
function switchUpdating()
{
    if( timeoutId !== undefined )
    {
        console.log("Updating stopped");
        clearTimeout(timeoutId);
        timeoutId = undefined;
        $("#switch").text("Start updating");
    }
    else
    {
        console.log("Updating started");
        timeoutId = setTimeout(updateMap, 5000);
        $("#switch").text("Stop updating");
    }
    
}

var iteration = 0;

function updateMap()
{
    if( updatingMutex )
    {
        timeoutId = setTimeout(updateMap, 100);
        return;
    }
    updatingMutex = true;
   
    var updatePath = false;

    var newVer;
    for (var i = 0; i < vertexies.length; i++)
    {
        if (vertexies[i].edges.length > 0)
        {
            newVer = vertexies[i].edges[0].ver + 1;
            break;
        }
    }
    var updated = 0;
    for (var i = 0; i < vertexies.length; i++)
    {
        var edges = vertexies[i].edges;
        for (var j = 0; j < edges.length; j++)
        {
            if (edges[j].ver !== newVer)
            {
                var newLoad = Math.round(edges[j].load + (Math.random() * 4 - 2));
                if (newLoad < 1)
                {
                    newLoad = 1;
                }
                else if (newLoad > 10)
                {
                    newLoad = 10;
                }

                if (newLoad !== edges[j].load)
                {
                    updated++;

                    edges[j].load = newLoad;
                    edges[j].line.setStyle(trafficColors[newLoad]);

                    if( !updatePath && path.vertexies !== null )
                    {
                        var i1 = path.vertexies.indexOf(i);
                        // Есть ли вершина в пути и есть ли ребро в пути
                        if( i1 !== -1 && ( 
                                (path.vertexies.length > i1 + 1 && path.vertexies[i1 + 1] === j)
                                  ||
                                (i1 > 0 && path.vertexies[i1 - 1] === j) ) 
                          )
                        {
                            updatePath = true;
                        }
                    }

                }

                edges[j].ver = newVer;
            }
        }
    }
    console.log("Iteration:" + iteration + ", updated edges: " + updated);
    iteration++;
    if( timeoutId !== undefined )
    {
        timeoutId = setTimeout(updateMap, 5000);
    }

    if( updatePath )
    {
        setTimeout(findPath, 100);
    }

    updatingMutex = false;
}

