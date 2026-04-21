| Category       | Original                                                            	|
|-----------------|------------------------------------------------------------------------------------------|
| Backend         | Python 3 BaseHTTPRequestHandler HTTP server (server3.py)                                |
| Data transport  | Client-side XHR polling every 100ms (DataStreamer.ts)                                   |
| Frontend        | React 16, TypeScript 3, Create React App 2.1                                             |
| Charting        | @jpmorganchase/perspective v0.2.12 (WASM-based, WebAssembly)                            |
| Node            | reqNode v11, npm v6.4.1 (both EOL since ~2019)                                          |


## Bugs:
- 1. clicking "start streaming" re-appends all old rows, causing duplicate in the Perspective table(fixs: use table.update() with deduplication by timestamp+stock key)
- 2. data only fetched once per button click(fix: wrap DataStreamer.getData in a setInterval(..., 100)loop)
- 3. show ratio of ABC/DEF ask prices, rolling upper/lower bounds(±10% of 12-period avg),and red alert lines when bounds are crossed


## Streaming Data
- from  JP Morgan Chase virtual internship 
- technology team at JP Morgan Chase & Co


<h2 id="task"> Task Overview </h2>
<p>Use JP Morgan Chase's frameworks and tools Implement data visualization</p>

<ol>
	<li>[goal-a] In the client application, observe that when new data feed is retrieved whenever you click the 'Start Streaming Data' button, the previous entry is re-entered into the table. Update the application so that the table does not have duplicated entries</li>
	<li>[goal-b] We also want the react app to keep continuosly requesting data from the python server. Currently, the data feed is called only once every time the 'Start Streaming' button is clicked. Change the application to continuously query the datafeed every 100ms when the 'Start Streaming' is clicked.</li>
	<li>[goal-c] Currently, the Perspective element only shows the data in table view after the data loads. Add Perspective configurations so that when the data is loaded, it shows the historical data of ask_price ABC in the Y line chart.</li>
</ol>

<h2 id="task"> Task Overview </h2>
Display data visually for traders.
<b>Aim:</b> Use Perspective to generate a chart that displays the data feed in a clear and visually appealing manner for traders to monitor this trading strategy. Basically, you have to modify the existing live chart to be able to (1) track and display the ratio between the two stock prices (2) show the historical upper and lower bounds of the stocks' ratio (3) and finally, show 'alerts'  whenever these bounds are crossed by the ratio.

<ol>
	<li>Please clone this repository to start the task</li>
	<li>From the existing live graph, update it to track the ratio between two stocks over time and NOT the two stocks’ top_ask_price over time.</li>
	<li>Update the graph to also track the historical upper and lower bounds of the stocks' ratio</li>
	<li>Trigger 'alerts' (i.e. draw red lines) on the graph whenever the bounds are crossed by the calculated ratio in a specific time period</li>
</ol>





Run <code>npm install && npm start</code> to start the React application.

The recommended version are node v11.0.0 and npm v6.4.1

Open http://localhost:3000 to view the app in the browser. The page will reload if you make edits.
