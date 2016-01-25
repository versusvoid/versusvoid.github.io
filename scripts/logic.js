// Генерация случайного цвета
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

// словарь - id узла из OSM к индексу вершины
var idToIndex = {};
// вершины графа
var vertexies = new Array();

// цвета загруженности рёбер
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

// объект библиотеки leaflet
var map;

// выскакивающая иконка с координатами
var popup = L.popup();
function onMapClick(e)
{
    popup
        .setLatLng(e.latlng)
        .setContent("You clicked the map at " + e.latlng.toString())
        .openOn(map);
}

// инициализация карты
function initMap()
{
    var apiKey = '460a360c630e43849b9f1ede2511e713';

    map = L.map('map')
        .setView([59.96231, 30.30836], 13);
    L.tileLayer('http://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Map tiles by CartoDB, under CC BY 3.0.,
        maxZoom: 18
    })
        .addTo(map);

    map.on('click', onMapClick);

    // загружаем данные карты
    $.getJSON('ways.json', onMapLoaded);
}

// логическое расстояние между двумя точками на карте
var scale = 10000;
function distance(p1, p2)
{
    var x = p1.lat*scale - p2.lat*scale;
    var y = p1.lng*scale - p2.lng*scale;
    return Math.sqrt(x*x + y*y);
}

// обработчик загрузки данных карты
function onMapLoaded(json)
{
    // извлечение дорог из карты
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
            // добавление ребра
            if (way.nodes[i] in idToIndex &&
                way.nodes[i + 1] in idToIndex)
            {
                // индексы вершин и сами вершины
                var v1id = idToIndex[way.nodes[i]];
                var v1 = vertexies[v1id];
                var v2id = idToIndex[way.nodes[i + 1]];
                var v2 = vertexies[v2id];

                // добавление ребра на карту
                var points = [new L.LatLng(v1.lat, v1.lng), new L.LatLng(v2.lat, v2.lng)];
                var polyline = L.polyline(points,
                {
                    color: trafficColors[1].color,
                    opacity: 0.75
                })
                    .addTo(map);

                // описание ребра
                var edge = {
                    v1: Math.min(v1id, v2id),
                    v2: Math.max(v1id, v2id),
                    load: 1,
                    length: distance(v1, v2),
                    line: polyline,
                    ver: 0
                };

                // добавление обработчика
                polyline.on('click', function (inV1Id, inV2Id, isBidirect)
                {
                    return (function (e)
                    {
                        console.log("Click on edge from " + inV1Id + " to " + inV2Id + (isBidirect?" bidirect":" directed"));
                        edgeClicked(e, inV1Id, inV2Id);
                    });
                }(edge.v1, edge.v2, isOneWay));

                // добавляем к вершинам ссылки на рёбра
                v1.edges.push(edge);
//                if( !isOneWay )
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
}

// иконка начала пути
var startIcon = L.icon({
    iconUrl: 'images/start-marker.png',
    iconSize: [32, 37],
    iconAnchor: [15, 34],
    popupAnchor: [0, 0],
});

// иконка конца пути
var endIcon = L.icon({
    iconUrl: 'images/end-marker.png',
    iconSize: [32, 37],
    iconAnchor: [15, 34],
    popupAnchor: [0, 0],
});

// структура описывающая путь
var path = 
    {
        source: null, 
        selectingSource: false, 
        
        dest: null, 
        selectingDest: false, 
        
        vertexies: null,
        line: null
    };

// функция стирающая все данные о пути
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

// переключатель для выбора начала пути
function selectSource()
{
    path.selectingSource = true;
    path.selectingDest = false;
}
// переключатель для выбора конца пути
function selectDest()
{
    path.selectingDest = true;
    path.selectingSource = false;
}
// обработчик нажатия на ребро
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

        path.source.edge = {v1: v1id, v2: v2id};
        
        path.source.marker = 
            new L.Marker(
                new L.LatLng(e.latlng.lat, e.latlng.lng), 
                {
                    title: "Start point",
                    icon: startIcon
                }
            ).addTo(map);
    }
    else if( path.selectingDest )
    {
        if( path.dest != null )
        {
            map.removeLayer(path.dest.marker);
            delete path.dest.marker;
        }
        path.dest = {marker: null, edge: null};

        path.dest.edge = {v1: v1id, v2: v2id};
        
        path.dest.marker =
            new L.Marker(
                new L.LatLng(e.latlng.lat, e.latlng.lng), 
                {
                    title: "End point",
                    icon: endIcon
                }
            ).addTo(map);
    }
    else
    {
        // если сейчас ничего не выбираем - просто показываем данные ребра
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

// мютекс на поиск пути, обновление пути и обновление карты
var updatingMutex = false;

// поиск пути
function findPath()
{
    if( path.source === null || path.dest === null )
        return;

    if( updatingMutex )
    {
        setTimeout(findPath, 100);
        return;
    }

    updatingMutex = true;
    
    // алгоритм Дейкстры
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

    // восстановление пути
    var pathNodes = [path.dest.edge.v1];
    var pathPoints = [new L.LatLng(vertexies[path.dest.edge.v1].lat, vertexies[path.dest.edge.v1].lng)];
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
                vertexies[pathNodes[0]].lng));
    }
    while( pathNodes[0] !== path.source.edge.v1 && pathNodes.length < 3000 );

    if( path.line !== null )
    {
        map.removeLayer(path.line);
        delete path.line;
        path.line = null;
    }

    // если первое ребро === ребру начала пути - удаляем его
    if( pathNodes[1] === path.source.edge.v2 )
    {
       pathNodes.shift();
       pathPoints.shift();
    }

    // аналогично с концом пути
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

    if( advanceTimeoutId !== undefined )
    {
        clearTimeout(advanceTimeoutId);
    }
    advanceTimeoutId = setTimeout(advancePath, 3000);

    updatingMutex = false;
}

// ребро из @v1 в @v2
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

// "скорость" движения
var speed = 30;

// идентификатор таймера продвижения
var advanceTimeoutId;

// продвижение по пути
function advancePath()
{
    if( updatingMutex )
    {
        advanceTimeoutId = setTimeout(advancePath, 100);
        return;
    }

    advanceTimeoutId = undefined;

    if( path.line === null )
    {
        return;
    }

    updatingMutex = true;

    var latLngs = path.line.getLatLngs();
    var advancedDistance = 0;
    var nextDistance = distance(latLngs[0], latLngs[1])*
                         getEdge(path.source.edge.v1, path.source.edge.v2).load;
    
    while( path.vertexies.length > 0 && 
             advancedDistance + nextDistance < speed )
    {
        advancedDistance += nextDistance;

        latLngs.shift(); 
        if( path.vertexies.length > 1 )
        {
            if( path.vertexies[0] === path.source.edge.v1 )
            {
                path.source.edge.v2 = path.vertexies[1];
            }
            else
            {
                path.source.edge.v1 = path.vertexies[1];
            }
        }
        else
        {
            path.source.edge = path.dest.edge;
        }
        path.vertexies.shift();
       
        nextDistance = distance(latLngs[0], latLngs[1])*
                         getEdge(path.source.edge.v1, path.source.edge.v2).load;
    }

    if( path.vertexies.length === 0 &&
          nextDistance + advancedDistance <= speed )
    {
        clearPath();
    }
    else
    {
        var dif = (speed - advancedDistance) / nextDistance;
        var newStart = 
                new L.LatLng(
                        latLngs[0].lat*(1 - dif) + latLngs[1].lat*dif,
                        latLngs[0].lng*(1 - dif) + latLngs[1].lng*dif);
        
        path.source.marker.setLatLng(newStart);
        path.line.spliceLatLngs(0, 1, newStart);

        advanceTimeoutId = setTimeout(advancePath, 3000);
    }

    updatingMutex = false;
}

// идентификатор таймера обновления
var timeoutId;
// переключатель обновления
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

// итерация(поколение) обновления карты
var iteration = 0;

// обновление карты
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
                    
                    // Проверка, задело ли обновление путь
                    if( !updatePath && path.vertexies !== null )
                    {
                        var i1 = path.vertexies.indexOf(i);
                        var i2 = edges[j].v1 === i1 ? edges[j].v2 : edges[j].v2;
                        // Есть ли вершина в пути и есть ли ребро в пути
                        if( i1 !== -1 && ( 
                                (path.vertexies.length > i1 + 1 && path.vertexies[i1 + 1] === i2)
                                  ||
                                (i1 > 0 && path.vertexies[i1 - 1] === i2) ) 
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

