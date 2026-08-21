"use client";

import React, { ChangeEvent, useMemo, useRef, useState } from "react";

import {

ArrowLeftRight,

Check,

CloudUpload,

Download,

FileText,

Home,

Layers3,

MapPin,

Move,

Phone,

Redo2,

RotateCcw,

Ruler,

Save,

Share2,

Sparkles,

Trash2,

Trees,

Undo2,

Waves,

} from "lucide-react";

type ToolId =

| "remove-trees"

| "house-pad"

| "driveway"

| "shop-pad"

| "gravel"

| "pond"

| "measure";

type ProjectItem = {

id: string;

tool: ToolId;

label: string;

x: number;

y: number;

width: number;

height: number;

rotation?: number;

color: string;

};

type HistoryState = {

items: ProjectItem[];

};

export default function A7PropertyVisualizer() {

const [propertyImage, setPropertyImage] = useState("");

const [beforeImage, setBeforeImage] = useState("");

const [selectedTool, setSelectedTool] = useState<ToolId>("house-pad");

const [items, setItems] = useState<ProjectItem[]>([]);

const [history, setHistory] = useState<HistoryState[]>([]);

const [future, setFuture] = useState<HistoryState[]>([]);

const [showLabels, setShowLabels] = useState(true);

const [showBoundaries, setShowBoundaries] = useState(true);

const [showDimensions, setShowDimensions] = useState(true);

const [compare, setCompare] = useState(50);

const [viewMode, setViewMode] = useState<"aerial" | "2d">("aerial");

const [zoom, setZoom] = useState(1);

const [isDragging, setIsDragging] = useState(false);

const [draggingItem, setDraggingItem] = useState<{

id: string;

startX: number;

startY: number;

originalItems: ProjectItem[];

} | null>(null);

const [pan, setPan] = useState({ x: 0, y: 0 });

const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

const [address, setAddress] = useState("");

const [name, setName] = useState("");

const [email, setEmail] = useState("");

const [phone, setPhone] = useState("");

const [projectNote, setProjectNote] = useState("");

const [estimateSent, setEstimateSent] = useState(false);

const [saved, setSaved] = useState(false);

const [shareMessage, setShareMessage] = useState("");

const [selectedId, setSelectedId] = useState<string | null>(null);

const fileInputRef = useRef<HTMLInputElement>(null);

const canvasRef = useRef<HTMLDivElement>(null);

const selectedItem = items.find((item) => item.id === selectedId);

const selectedSummary = useMemo(() => {

const counts = new Map<string, number>();

items.forEach((item) => {

counts.set(item.label, (counts.get(item.label) || 0) + 1);

});

return Array.from(counts.entries());

}, [items]);

const roughDimensions = useMemo(() => {

return items.map((item) => {

const widthFt = Math.max(10, Math.round(item.width * 0.72));

const heightFt = Math.max(10, Math.round(item.height * 0.72));

if (item.tool === "driveway") return `${item.label} ~${widthFt + 100} ft`;

if (item.tool === "pond") return `${item.label} ~${Math.round(widthFt * heightFt * 0.01)} acre`;

return `${item.label} ${widthFt}' × ${heightFt}'`;

});

}, [items]);

function pushHistory(nextItems: ProjectItem[], previousItems = items) {

setHistory((prev) => [...prev.slice(-19), { items: previousItems }]);

setFuture([]);

setItems(nextItems);

setSaved(false);

}

function addItem(tool: ToolId) {

if (tool === "measure") {

setSelectedTool(tool);

return;

}

if (!propertyImage) {

alert("Please upload a property photo first.");

fileInputRef.current?.click();

return;

}

const id = `${tool}-${Date.now()}`;

const defaults: Record<Exclude<ToolId, "measure">, Omit<ProjectItem, "id" | "tool">> = {

"remove-trees": {

label: "Remove Trees",

x: 12,

y: 15,

width: 28,

height: 24,

color: "#a3a3a3",

},

"house-pad": {

label: "House Pad",

x: 35,

y: 28,

width: 25,

height: 20,

color: "#f5e7a1",

},

driveway: {

label: "Driveway",

x: 50,

y: 50,

width: 8,

height: 32,

color: "#a3a3a3",

},

"shop-pad": {

label: "Shop Pad",

x: 66,

y: 42,

width: 18,

height: 16,

color: "#f5e7a1",

},

gravel: {

label: "Gravel Area",

x: 63,

y: 62,

width: 22,

height: 20,

color: "#d4d4d4",

},

pond: {

label: "Pond",

x: 22,

y: 65,

width: 18,

height: 15,

color: "#3b82f6",

},

};

pushHistory([

...items,

{

id,

tool,

...defaults[tool],

},

]);

setSelectedId(id);

setSelectedTool(tool);

}

function removeSelected() {

if (!selectedId) return;

pushHistory(items.filter((item) => item.id !== selectedId));

setSelectedId(null);

}

function undo() {

if (!history.length) return;

const previous = history[history.length - 1];

setFuture((prev) => [...prev, { items }]);

setItems(previous.items);

setHistory((prev) => prev.slice(0, -1));

setSelectedId(null);

}

function redo() {

if (!future.length) return;

const next = future[future.length - 1];

setHistory((prev) => [...prev, { items }]);

setItems(next.items);

setFuture((prev) => prev.slice(0, -1));

}

function resetView() {

setZoom(1);

setPan({ x: 0, y: 0 });

}

function resetProject() {

setHistory([]);

setFuture([]);

setItems([]);

setSelectedId(null);

setSaved(false);

setEstimateSent(false);

setShareMessage("");

}

function handleUpload(event: ChangeEvent<HTMLInputElement>) {

const file = event.target.files?.[0];

if (!file) return;

const reader = new FileReader();

reader.onload = () => {

const imageUrl = String(reader.result || "");

setPropertyImage(imageUrl);

setBeforeImage(imageUrl);

resetProject();

};

reader.readAsDataURL(file);

}

function updateItem(id: string, patch: Partial<ProjectItem>) {

const nextItems = items.map((item) =>

item.id === id

? {

...item,

...patch,

x: patch.x === undefined ? item.x : clamp(patch.x, 0, 96),

y: patch.y === undefined ? item.y : clamp(patch.y, 0, 96),

width: patch.width === undefined ? item.width : clamp(patch.width, 4, 90),

height: patch.height === undefined ? item.height : clamp(patch.height, 4, 90),

}

: item

);

pushHistory(nextItems);

}

function saveProject() {

const payload = {

address,

name,

email,

phone,

projectNote,

propertyImage,

items,

savedAt: new Date().toISOString(),

};

localStorage.setItem("a7-property-project", JSON.stringify(payload));

setSaved(true);

}

async function shareProject() {

const text = `A7 Property Visualizer project: ${address}`;

try {

if (navigator.share) {

await navigator.share({ title: "A7 Property Concept", text });

} else {

await navigator.clipboard?.writeText(window.location.href);

setShareMessage("Project link copied.");

setTimeout(() => setShareMessage(""), 2500);

}

} catch {

setShareMessage("Share cancelled.");

setTimeout(() => setShareMessage(""), 2500);

}

}

function downloadConcept() {

if (!propertyImage) {

alert("Please upload a property photo first.");

return;

}

const svg = createConceptSvg({

propertyImage,

address,

name,

email,

phone,

projectNote,

items,

selectedSummary,

roughDimensions,

});

const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });

const url = URL.createObjectURL(blob);

const anchor = document.createElement("a");

anchor.href = url;

anchor.download = "a7-property-concept.svg";

anchor.click();

URL.revokeObjectURL(url);

}

function requestEstimate() {

if (!propertyImage) {

alert("Please upload a property photo first.");

return;

}

if (!address || !name || !email) {

alert("Please provide your property address, name and email.");

return;

}

saveProject();

setEstimateSent(true);

const subject = encodeURIComponent(`A7 estimate request - ${address}`);

const body = encodeURIComponent(

[

`Property: ${address}`,

`Customer: ${name}`,

`Email: ${email}`,

`Phone: ${phone}`,

"",

"Selected improvements:",

...(selectedSummary.length

? selectedSummary.map(([label, count]) => `- ${label}${count > 1 ? ` x${count}` : ""}`)

: ["- None selected yet"]),

"",

"Rough dimensions:",

...(roughDimensions.length ? roughDimensions.map((dimension) => `- ${dimension}`) : ["- Not provided"]),

"",

`Project notes: ${projectNote || "None"}`,

].join("\\\\n")

);

window.location.href = `mailto:?subject=${subject}&body=${body}`;

}

function onCanvasMouseDown(event: React.MouseEvent) {

if (!canvasRef.current) return;

if (selectedTool !== "measure") {

setIsDragging(true);

setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });

}

}

function onCanvasMouseMove(event: React.MouseEvent) {

if (draggingItem && canvasRef.current) {

const rect = canvasRef.current.getBoundingClientRect();

const item = draggingItem.originalItems.find((entry) => entry.id === draggingItem.id);

if (!item) return;

const deltaX = ((event.clientX - draggingItem.startX) / rect.width) * 100;

const deltaY = ((event.clientY - draggingItem.startY) / rect.height) * 100;

setItems((prev) =>

prev.map((entry) =>

entry.id === draggingItem.id

? {

...entry,

x: clamp(item.x + deltaX, 0, 100 - entry.width),

y: clamp(item.y + deltaY, 0, 100 - entry.height),

}

: entry

)

);

setSaved(false);

return;

}

if (!isDragging) return;

setPan({

x: event.clientX - dragStart.x,

y: event.clientY - dragStart.y,

});

}

function onCanvasMouseUp() {

if (draggingItem) {

const changed = JSON.stringify(draggingItem.originalItems) !== JSON.stringify(items);

if (changed) {

setHistory((prev) => [...prev.slice(-19), { items: draggingItem.originalItems }]);

setFuture([]);

}

}

setDraggingItem(null);

setIsDragging(false);

}

return (

<div className="min-h-screen bg-[#0a0a0a] py-8 text-white xl:py-20">

<div className="mx-auto max-w-[1600px] overflow-hidden border border-zinc-800 bg-black shadow-2xl">

{/* Header */}

<header className="flex flex-col gap-4 border-b border-zinc-800 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">

<div className="flex items-center gap-4">

<div className="flex h-12 w-16 items-center justify-center border-r border-zinc-700 pr-4">

<div className="text-3xl font-black italic tracking-tighter">

<span className="text-white">A</span>

<span className="text-yellow-400">7</span>

</div>

</div>

<div>

<h1 className="text-xl font-black tracking-wide sm:text-2xl">

A7 PROPERTY VISUALIZER

</h1>

<p className="text-xs font-bold text-yellow-400 sm:text-sm">

Visualize Your Property. Plan Your Project. Request Your Estimate.

</p>

</div>

</div>

<div className="flex flex-wrap gap-2">

<button onClick={downloadConcept} className="top-action">

<Download size={17} /> Download Concept

</button>

<button onClick={shareProject} className="top-action">

<Share2 size={17} /> Share

</button>

<button onClick={saveProject} className="top-action">

<Save size={17} /> {saved ? "Saved" : "Save Project"}

</button>

</div>

</header>

{/* Main */}

<div className="grid min-h-[720px] lg:grid-cols-[184px_minmax(0,1fr)_238px] xl:min-h-[760px] xl:grid-cols-[220px_minmax(0,1fr)_285px]">

{/* Left tools */}

<aside className="border-b border-zinc-800 p-4 lg:border-b-0 lg:border-r lg:p-3 xl:p-4">

<SectionTitle>PROJECT TOOLS</SectionTitle>

<button

onClick={() => addItem("remove-trees")}

className={`tool-button ${selectedTool === "remove-trees" ? "tool-active" : ""}`}

>

<Trees size={18} />

<span>Remove Trees</span>

<Toggle on />

</button>

<button

onClick={() => addItem("house-pad")}

className={`tool-button ${selectedTool === "house-pad" ? "tool-active" : ""}`}

>

<Home size={18} />

<span>Add House Pad</span>

<Toggle on />

</button>

<button

onClick={() => addItem("driveway")}

className={`tool-button ${selectedTool === "driveway" ? "tool-active" : ""}`}

>

<ArrowLeftRight size={18} />

<span>Add Driveway</span>

<Toggle on />

</button>

<button

onClick={() => addItem("shop-pad")}

className={`tool-button ${selectedTool === "shop-pad" ? "tool-active" : ""}`}

>

<Home size={18} />

<span>Add Shop / Barn Pad</span>

<Toggle on />

</button>

<button

onClick={() => addItem("gravel")}

className={`tool-button ${selectedTool === "gravel" ? "tool-active" : ""}`}

>

<Layers3 size={18} />

<span>Add Gravel Area</span>

<Toggle on />

</button>

<button

onClick={() => addItem("pond")}

className={`tool-button ${selectedTool === "pond" ? "tool-active" : ""}`}

>

<Waves size={18} />

<span>Add Pond</span>

<Toggle on />

</button>

<button

onClick={() => setSelectedTool("measure")}

className={`tool-button ${selectedTool === "measure" ? "tool-active" : ""}`}

>

<Ruler size={18} />

<span>Measurements</span>

<Toggle on={selectedTool === "measure"} />

</button>

<div className="my-5 border-t border-zinc-800" />

<SectionTitle>VIEW OPTIONS</SectionTitle>

<div className="grid grid-cols-2 gap-2">

<button

onClick={() => setViewMode("2d")}

className={`rounded-lg border px-2 py-3 text-xs font-bold ${

viewMode === "2d"

? "border-yellow-400 bg-yellow-400 text-black"

: "border-zinc-700 bg-zinc-900 text-zinc-300"

}`}

>

<Layers3 className="mx-auto mb-1" size={17} />

2D Top Down

</button>

<button

onClick={() => setViewMode("aerial")}

className={`rounded-lg border px-2 py-3 text-xs font-bold ${

viewMode === "aerial"

? "border-yellow-400 bg-yellow-400 text-black"

: "border-zinc-700 bg-zinc-900 text-zinc-300"

}`}

>

<MapPin className="mx-auto mb-1" size={17} />

Aerial View

</button>

</div>

<div className="my-5 border-t border-zinc-800" />

<SectionTitle>DISPLAY</SectionTitle>

<DisplayToggle

label="Labels"

checked={showLabels}

onClick={() => setShowLabels((v) => !v)}

/>

<DisplayToggle

label="Boundaries"

checked={showBoundaries}

onClick={() => setShowBoundaries((v) => !v)}

/>

<DisplayToggle

label="Dimensions"

checked={showDimensions}

onClick={() => setShowDimensions((v) => !v)}

/>

<div className="mt-5 grid grid-cols-2 gap-2">

<button onClick={undo} className="small-button">

<Undo2 size={15} /> Undo

</button>

<button onClick={resetView} className="small-button">

<RotateCcw size={15} /> Reset View

</button>

<button onClick={redo} className="small-button">

<Redo2 size={15} /> Redo

</button>

<button onClick={resetProject} className="small-button">

<Trash2 size={15} /> Clear

</button>

</div>

<input

ref={fileInputRef}

type="file"

accept="image/*"

hidden

onChange={handleUpload}

/>

<button

onClick={() => fileInputRef.current?.click()}

className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-yellow-400 bg-yellow-400 px-3 py-3 text-sm font-black text-black hover:bg-yellow-300 lg:text-xs xl:text-sm"

>

<CloudUpload size={18} /> Upload Property Photo

</button>

</aside>

{/* Canvas */}

<main className="relative min-w-0 bg-zinc-950">

<div

ref={canvasRef}

className={`relative h-[620px] overflow-hidden sm:h-[720px] lg:h-[calc(100vh-172px)] lg:min-h-[640px] lg:max-h-[820px] xl:h-[720px] xl:min-h-0 xl:max-h-none ${

viewMode === "2d" ? "bg-[#d6d1c4]" : "bg-zinc-900"

}`}

onMouseDown={onCanvasMouseDown}

onMouseMove={onCanvasMouseMove}

onMouseUp={onCanvasMouseUp}

onMouseLeave={onCanvasMouseUp}

>

{viewMode === "aerial" && propertyImage ? (

<div

className="absolute inset-0 bg-cover bg-center transition-transform duration-150"

style={{

backgroundImage: `url(${propertyImage})`,

transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,

}}

/>

) : viewMode === "aerial" ? (

<div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950 px-6 text-center">

<div className="max-w-sm">

<CloudUpload className="mx-auto mb-4 text-yellow-400" size={44} />

<h2 className="text-xl font-black">Upload your property photo</h2>

<p className="mt-2 text-sm text-zinc-400">

Start with your own land image, then add pads, driveways, ponds, gravel areas, and measurements.

</p>

<button

onClick={() => fileInputRef.current?.click()}

className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg border border-yellow-400 bg-yellow-400 px-4 py-3 text-sm font-black text-black hover:bg-yellow-300"

>

<CloudUpload size={18} /> Select Image

</button>

</div>

</div>

) : (

<div className="absolute inset-0 opacity-80">

<div

className="h-full w-full"

style={{

backgroundImage:

"linear-gradient(rgba(70,65,50,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(70,65,50,.35) 1px, transparent 1px)",

backgroundSize: "50px 50px",

}}

/>

</div>

)}

<div className="pointer-events-none absolute inset-0 bg-black/15" />

{/* Canvas controls */}

<div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-white/20 bg-black/85 p-1.5 shadow-xl backdrop-blur">

<button onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))} className="zoom-btn">−</button>

<span className="min-w-16 text-center text-xs font-bold">{Math.round(zoom * 100)}%</span>

<button onClick={() => setZoom((z) => Math.min(2.2, z + 0.1))} className="zoom-btn">+</button>

<button onClick={resetView} className="zoom-btn px-3">

<Move size={14} /> Move

</button>

<button onClick={resetView} className="zoom-btn px-3">

<RotateCcw size={14} /> Reset

</button>

</div>

{/* Objects */}

{items.map((item) => (

<div

key={item.id}

onMouseDown={(e) => {

e.stopPropagation();

setSelectedId(item.id);

setDraggingItem({

id: item.id,

startX: e.clientX,

startY: e.clientY,

originalItems: items,

});

}}

onClick={(e) => {

e.stopPropagation();

setSelectedId(item.id);

}}

className={`absolute z-20 cursor-pointer select-none ${

item.tool === "driveway" ? "rounded-full" : "rounded-lg"

} ${

selectedId === item.id ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-transparent" : ""

}`}

style={{

left: `${item.x}%`,

top: `${item.y}%`,

width: `${item.width}%`,

height: `${item.height}%`,

background:

item.tool === "pond"

? "rgba(30, 136, 229, .72)"

: item.tool === "driveway"

? "rgba(115,115,115,.88)"

: item.tool === "remove-trees"

? "rgba(100,100,100,.55)"

: "rgba(245, 231, 161, .34)",

border: showBoundaries

? `2px dashed ${item.tool === "pond" ? "#60a5fa" : item.color}`

: "none",

boxShadow: item.tool === "driveway" ? "0 0 18px rgba(0,0,0,.35)" : "none",

}}

>

{showLabels && (

<div className="absolute inset-0 flex items-center justify-center text-center text-[10px] font-black text-white drop-shadow-md sm:text-xs">

{item.label}

{showDimensions && item.tool !== "driveway" && (

<span className="ml-1">

{Math.max(10, Math.round(item.width * 0.72))}&apos; ×{" "}

{Math.max(10, Math.round(item.height * 0.72))}&apos;

</span>

)}

</div>

)}

</div>

))}

{selectedTool === "measure" && (

<div className="absolute left-5 top-5 z-40 rounded-lg border border-yellow-400/50 bg-black/85 px-4 py-3 text-xs text-zinc-200 backdrop-blur">

<div className="flex items-center gap-2 font-black text-yellow-400">

<Ruler size={15} /> Measurement Mode

</div>

<p className="mt-1 max-w-xs">

Add an object and use its displayed dimensions as a rough planning estimate.

Exact survey measurements should be verified professionally.

</p>

</div>

)}

{/* Before / After */}

{propertyImage && (

<div className="absolute bottom-4 left-4 z-30 w-[260px] overflow-hidden rounded-xl border border-white/30 bg-black/90 shadow-2xl sm:w-[330px] lg:w-[390px] xl:w-[330px]">

<div className="relative h-40 overflow-hidden sm:h-48 lg:h-56 xl:h-48">

<img src={beforeImage} alt="Before property" className="absolute inset-0 h-full w-full object-cover" />

<div

className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-white"

style={{ width: `${compare}%` }}

>

<div className="h-full w-[330px] max-w-none bg-black/10 lg:w-[390px] xl:w-[330px]">

<img src={propertyImage} alt="After concept" className="h-full w-full object-cover" />

<ConceptItems

items={items}

showLabels={showLabels}

showBoundaries={showBoundaries}

showDimensions={showDimensions}

compact

/>

</div>

</div>

<div className="absolute left-2 top-2 rounded bg-black/75 px-2 py-1 text-[9px] font-black">

AFTER (CONCEPT)

</div>

<div className="absolute right-2 top-2 rounded bg-black/75 px-2 py-1 text-[9px] font-black">

BEFORE

</div>

<div

className="absolute top-0 bottom-0 z-20 w-1 bg-white"

style={{ left: `calc(${compare}% - 2px)` }}

/>

</div>

<div className="flex items-center gap-3 px-3 py-2">

<ArrowLeftRight size={14} />

<input

type="range"

min="0"

max="100"

value={compare}

onChange={(e) => setCompare(Number(e.target.value))}

className="w-full accent-yellow-400"

/>

</div>

<p className="pb-2 text-center text-[10px] text-zinc-400">

Drag to compare before & after

</p>

</div>

)}

</div>

{/* Selected item editor */}

{selectedItem && (

<div className="border-t border-zinc-800 bg-black px-4 py-3">

<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

<div>

<p className="text-xs font-black uppercase text-yellow-400">Selected</p>

<p className="font-bold">{selectedItem.label}</p>

</div>

<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

<NumberInput

label="X"

value={selectedItem.x}

onChange={(v) => updateItem(selectedItem.id, { x: v })}

/>

<NumberInput

label="Y"

value={selectedItem.y}

onChange={(v) => updateItem(selectedItem.id, { y: v })}

/>

<NumberInput

label="W"

value={selectedItem.width}

onChange={(v) => updateItem(selectedItem.id, { width: v })}

/>

<NumberInput

label="H"

value={selectedItem.height}

onChange={(v) => updateItem(selectedItem.id, { height: v })}

/>

</div>

<button

onClick={removeSelected}

className="flex items-center justify-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-xs font-black text-red-300"

>

<Trash2 size={15} /> Remove

</button>

</div>

</div>

)}

</main>

{/* Right summary */}

<aside className="border-t border-zinc-800 p-4 lg:border-l lg:border-t-0 lg:p-3 xl:p-4">

<SectionTitle>PROJECT SUMMARY</SectionTitle>

<label className="relative block">

<MapPin className="absolute left-1 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={16} />

<input

value={address}

onChange={(e) => setAddress(e.target.value)}

className="dark-input !pl-5"

placeholder="Property address"

/>

</label>

<div className="my-4 border-t border-zinc-800" />

<SectionTitle>SELECTED IMPROVEMENTS</SectionTitle>

<div className="space-y-2">

{selectedSummary.length ? (

selectedSummary.map(([label, count]) => (

<div key={label} className="flex items-center justify-between text-xs">

<span className="flex items-center gap-2">

<span className="flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 text-black">

<Check size={10} />

</span>

{label}

</span>

{count > 1 && <span className="text-zinc-500">×{count}</span>}

</div>

))

) : (

<p className="text-xs text-zinc-500">No improvements selected yet.</p>

)}

</div>

<div className="my-4 border-t border-zinc-800" />

<SectionTitle>ROUGH DIMENSIONS</SectionTitle>

<div className="space-y-1.5 text-xs text-zinc-300">

{roughDimensions.length ? (

roughDimensions.map((dimension) => <p key={dimension}>{dimension}</p>)

) : (

<p className="text-zinc-500">Add project items to calculate rough dimensions.</p>

)}

</div>

<div className="my-4 border-t border-zinc-800" />

<SectionTitle>CUSTOMER INFORMATION</SectionTitle>

<div className="space-y-2">

<InputWithIcon icon={<Home size={15} />} value={name} onChange={setName} placeholder="Customer name" />

<InputWithIcon icon={<FileText size={15} />} value={email} onChange={setEmail} placeholder="Email" />

<InputWithIcon icon={<Phone size={15} />} value={phone} onChange={setPhone} placeholder="Phone" />

</div>

<textarea

value={projectNote}

onChange={(e) => setProjectNote(e.target.value)}

rows={4}

placeholder="Project details / what would you like to improve?"

className="dark-input mt-2 resize-none !placeholder:text-black"

/>

<button

onClick={requestEstimate}

className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-400 px-4 py-3.5 text-sm font-black text-black hover:bg-yellow-300"

>

<Sparkles size={17} /> REQUEST ESTIMATE

</button>

{estimateSent && (

<div className="mt-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-300">

Estimate request prepared successfully. Connect this button to your backend/API to submit it.

</div>

)}

<div className="my-4 border-t border-zinc-800" />

<div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">

<SectionTitle>WHAT A7 RECEIVES</SectionTitle>

<ul className="space-y-2 text-xs text-zinc-400">

<li>• Property Address</li>

<li>• Concept Image / This View</li>

<li>• Selected Work Items</li>

<li>• Approximate Dimensions</li>

<li>• Customer Contact Details</li>

<li>• Project Notes</li>

</ul>

<p className="mt-3 text-[10px] leading-relaxed text-zinc-600">

All dimensions are planning estimates only. Final measurements should be verified before construction.

</p>

</div>

{shareMessage && (

<div className="mt-3 rounded-lg bg-zinc-900 p-2 text-center text-xs text-yellow-400">

{shareMessage}

</div>

)}

</aside>

</div>

{/* Footer */}

<footer className="border-t border-zinc-800 px-5 py-4">

<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

<div className="flex items-center gap-3">

<div className="text-3xl font-black italic">

<span>A</span><span className="text-yellow-400">7</span>

</div>

<div>

<p className="text-sm font-black">REAL SOLUTIONS. <span className="text-yellow-400">REAL RESULTS.</span></p>

<p className="text-[10px] text-zinc-500">LAND CLEARING • SITE PREP • DRIVEWAYS • HOUSE PADS • PONDS</p>

</div>

</div>

<div className="text-left lg:text-right">

<p className="text-lg font-black text-yellow-400">LET&apos;S BUILD YOUR PROJECT</p>

<p className="text-xs text-zinc-400">www.a7landsolutions.com</p>

</div>

</div>

</footer>

</div>

<style jsx>{`

.top-action {

display: inline-flex;

align-items: center;

gap: 8px;

border: 1px solid #3f3f46;

background: #111113;

padding: 10px 12px;

border-radius: 8px;

font-size: 12px;

font-weight: 800;

color: #e4e4e7;

transition: .2s;

}

.top-action:hover { border-color: #facc15; color: #facc15; }

.tool-button {

display: flex;

width: 100%;

align-items: center;

gap: 9px;

margin-bottom: 7px;

border: 1px solid #27272a;

background: #18181b;

padding: 10px;

border-radius: 7px;

color: #d4d4d8;

font-size: 11px;

font-weight: 700;

text-align: left;

transition: .2s;

}

.tool-button:hover, .tool-active { border-color: #facc15; background: #27220b; color: white; }

.tool-button span { flex: 1; }

.small-button {

display: flex;

align-items: center;

justify-content: center;

gap: 6px;

border: 1px solid #27272a;

background: #18181b;

border-radius: 7px;

padding: 9px 5px;

font-size: 10px;

font-weight: 800;

color: #d4d4d8;

}

.small-button:hover { border-color: #52525b; }

.zoom-btn {

display: inline-flex;

align-items: center;

justify-content: center;

gap: 5px;

min-width: 30px;

height: 30px;

border-radius: 6px;

color: white;

font-size: 12px;

font-weight: 800;

}

.zoom-btn:hover { background: #27272a; }

.dark-input {

width: 100%;

border: 1px solid #27272a;

background: #111113;

color: #ffffff;

border-radius: 7px;

padding: 10px 12px;

font-size: 13px;

outline: none;

}

.dark-input::placeholder {

color: #71717a;

}

.dark-input:focus { border-color: #facc15; }

@media (min-width: 1024px) and (max-width: 1279px) {

.top-action {

gap: 6px;

padding: 8px 10px;

font-size: 10px;

}

.tool-button {

gap: 7px;

margin-bottom: 6px;

padding: 8px;

font-size: 10px;

}

.small-button {

gap: 4px;

padding: 8px 4px;

font-size: 9px;

}

.dark-input {

padding: 8px 10px;

font-size: 11px;

}

.zoom-btn {

min-width: 28px;

height: 28px;

font-size: 11px;

}

}

`}</style>

</div>

);

}

function SectionTitle({ children }: { children: React.ReactNode }) {

return <h2 className="mb-3 text-[11px] font-black tracking-wide text-zinc-300">{children}</h2>;

}

function ConceptItems({

items,

showLabels,

showBoundaries,

showDimensions,

compact = false,

}: {

items: ProjectItem[];

showLabels: boolean;

showBoundaries: boolean;

showDimensions: boolean;

compact?: boolean;

}) {

return (

<div className="pointer-events-none absolute inset-0">

{items.map((item) => (

<div

key={item.id}

className={`absolute ${item.tool === "driveway" ? "rounded-full" : "rounded-lg"}`}

style={{

left: `${item.x}%`,

top: `${item.y}%`,

width: `${item.width}%`,

height: `${item.height}%`,

background: itemFill(item),

border: showBoundaries

? `1.5px dashed ${item.tool === "pond" ? "#60a5fa" : item.color}`

: "none",

}}

>

{showLabels && (

<div

className={`absolute inset-0 flex items-center justify-center text-center font-black text-white drop-shadow-md ${

compact ? "text-[7px]" : "text-[10px] sm:text-xs"

}`}

>

{item.label}

{showDimensions && item.tool !== "driveway" && !compact && (

<span className="ml-1">

{Math.max(10, Math.round(item.width * 0.72))}&apos; ×{" "}

{Math.max(10, Math.round(item.height * 0.72))}&apos;

</span>

)}

</div>

)}

</div>

))}

</div>

);

}

function Toggle({ on }: { on: boolean }) {

return (

<span className={`relative h-5 w-9 rounded-full ${on ? "bg-yellow-400" : "bg-zinc-700"}`}>

<span

className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${on ? "right-0.5" : "left-0.5"}`}

/>

</span>

);

}

function DisplayToggle({

label,

checked,

onClick,

}: {

label: string;

checked: boolean;

onClick: () => void;

}) {

return (

<button onClick={onClick} className="mb-2 flex w-full items-center gap-2 text-xs font-bold text-zinc-300">

<span className={`flex h-4 w-4 items-center justify-center rounded ${checked ? "bg-yellow-400 text-black" : "bg-zinc-700"}`}>

{checked ? <Check size={11} /> : null}

</span>

{label}

</button>

);

}

function NumberInput({

label,

value,

onChange,

}: {

label: string;

value: number;

onChange: (value: number) => void;

}) {

return (

<label className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5">

<span className="text-[9px] font-black text-zinc-500">{label}</span>

<input

type="number"

min={0}

max={100}

value={Math.round(value)}

onChange={(e) => onChange(Number(e.target.value))}

className="w-12 bg-transparent text-xs font-bold outline-none"

/>

</label>

);

}

function InputWithIcon({

icon,

value,

onChange,

placeholder,

}: {

icon: React.ReactNode;

value: string;

onChange: (value: string) => void;

placeholder: string;

}) {

return (

<label className="relative block">

<span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">{icon}</span>

<input

value={value}

onChange={(e) => onChange(e.target.value)}

placeholder={placeholder}

className="dark-input text-zinc-400 pl-10"

/>

</label>

);

}

function clamp(value: number, min: number, max: number) {

return Math.min(Math.max(value, min), max);

}

function itemFill(item: ProjectItem) {

if (item.tool === "pond") return "rgba(30, 136, 229, .72)";

if (item.tool === "driveway") return "rgba(115,115,115,.88)";

if (item.tool === "remove-trees") return "rgba(100,100,100,.55)";

if (item.tool === "gravel") return "rgba(212,212,212,.48)";

return "rgba(245, 231, 161, .36)";

}

function escapeXml(value: string) {

return value

.replace(/&/g, "&amp;")

.replace(/</g, "&lt;")

.replace(/>/g, "&gt;")

.replace(/"/g, "&quot;")

.replace(/'/g, "&apos;");

}

function createConceptSvg({

propertyImage,

address,

name,

email,

phone,

projectNote,

items,

selectedSummary,

roughDimensions,

}: {

propertyImage: string;

address: string;

name: string;

email: string;

phone: string;

projectNote: string;

items: ProjectItem[];

selectedSummary: [string, number][];

roughDimensions: string[];

}) {

const itemMarkup = items

.map((item) => {

const x = (item.x / 100) * 900;

const y = (item.y / 100) * 620;

const width = (item.width / 100) * 900;

const height = (item.height / 100) * 620;

const label = `${item.label}${

item.tool !== "driveway"

? ` ${Math.max(10, Math.round(item.width * 0.72))}' x ${Math.max(

10,

Math.round(item.height * 0.72)

)}'`

: ""

}`;

if (item.tool === "pond") {

return `

<ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${width / 2}" ry="${height / 2}" fill="rgba(30,136,229,.72)" stroke="#60a5fa" stroke-width="2" stroke-dasharray="7 5" />

<text x="${x + width / 2}" y="${y + height / 2}" text-anchor="middle" fill="#fff" font-size="14" font-weight="800">${escapeXml(label)}</text>

`;

}

return `

<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${

item.tool === "driveway" ? width / 2 : 6

}" fill="${itemFill(item)}" stroke="${item.color}" stroke-width="2" stroke-dasharray="7 5" />

<text x="${x + width / 2}" y="${y + height / 2}" text-anchor="middle" fill="#fff" font-size="14" font-weight="800">${escapeXml(label)}</text>

`;

})

.join("");

const summaryLines = selectedSummary.length

? selectedSummary.map(([label, count]) => `${label}${count > 1 ? ` x${count}` : ""}`)

: ["No improvements selected"];

const dimensionLines = roughDimensions.length ? roughDimensions : ["No rough dimensions yet"];

const sidebarLines = [

"PROJECT SUMMARY",

`Property: ${address}`,

"",

"SELECTED IMPROVEMENTS",

...summaryLines,

"",

"ROUGH DIMENSIONS",

...dimensionLines,

"",

"CUSTOMER INFORMATION",

name,

email,

phone,

"",

"PROJECT NOTES",

projectNote || "None",

];

const headings = [

"PROJECT SUMMARY",

"SELECTED IMPROVEMENTS",

"ROUGH DIMENSIONS",

"CUSTOMER INFORMATION",

"PROJECT NOTES",

];

const sidebarMarkup = sidebarLines

.slice(0, 25)

.map((line, index) => {

const isHeading = headings.includes(line);

return `<text x="956" y="${116 + index * 22}" fill="${

isHeading ? "#facc15" : "#e4e4e7"

}" font-size="${isHeading ? 15 : 13}" font-weight="${isHeading ? 900 : 600}">${escapeXml(line)}</text>`;

})

.join("");

return `<?xml version="1.0" encoding="UTF-8"?>

<svg xmlns="http://www.w3.org/2000/svg" width="1220" height="760" viewBox="0 0 1220 760">

<rect width="1220" height="760" fill="#050505"/>

<text x="34" y="42" fill="#ffffff" font-size="30" font-weight="900">A<tspan fill="#facc15">7</tspan> PROPERTY VISUALIZER</text>

<text x="34" y="66" fill="#facc15" font-size="15" font-weight="800">Visualize Your Property. Plan Your Project. Request Your Estimate.</text>

<clipPath><rect x="34" y="90" width="900" height="620" rx="8"/></clipPath>

<image href="${escapeXml(propertyImage)}" x="34" y="90" width="900" height="620" preserveAspectRatio="xMidYMid slice" clip-path="url(#propertyClip)"/>

<rect x="34" y="90" width="900" height="620" fill="rgba(0,0,0,.16)" rx="8"/>

<g transform="translate(34 90)">${itemMarkup}</g>

<rect x="946" y="90" width="240" height="620" fill="#111113" stroke="#3f3f46" rx="8"/>

${sidebarMarkup}

<text x="34" y="740" fill="#a1a1aa" font-size="12">Concept only. Final measurements should be verified before construction.</text>

</svg>`;

}
