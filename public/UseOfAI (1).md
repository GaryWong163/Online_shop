## Use of AI Acknowledgement

**Student ID**: 1155175986

**Project Phase**: 1A

**Date**: 31 Jan, 2025

## Acknowledgement

I acknowledge the use of [Copilot] to generate code towards the completion of the project.


**(Note that the code in this example does not achieve what we expect.)**
## Transcript

**Prompt**: in html: how to make the div show in vertical or horizontal

### Response
To control the layout of div elements in HTML, you can use CSS. Here are two common ways to achieve vertical and horizontal layouts:

Vertical Layout
To stack div elements vertically, you can use the default block-level behavior of div elements. Each div will take up the full width of its container and stack on top of each other.

<!DOCTYPE html>
<html>
<head>
<style>
.vertical-container {
  display: block;
}
.vertical-container div {
  background-color: lightblue;
  margin: 10px 0;
  padding: 20px;
}
</style>
</head>
<body>

<div class="vertical-container">
  <div>Div 1</div>
  <div>Div 2</div>
  <div>Div 3</div>
</div>

</body>
</html>
Horizontal Layout
To arrange div elements horizontally, you can use CSS Flexbox. This allows you to align items in a row.

<!DOCTYPE html>
<html>
<head>
<style>
.horizontal-container {
  display: flex;
}
.horizontal-container div {
  background-color: lightgreen;
  margin: 10px;
  padding: 20px;
}
</style>
</head>
<body>

<div class="horizontal-container">
  <div>Div 1</div>
  <div>Div 2</div>
  <div>Div 3</div>
</div>

</body>
</html>
Mixed Layout
If you want to combine both vertical and horizontal layouts, you can nest div elements and use Flexbox for the horizontal layout inside a vertical container.

<!DOCTYPE html>
<html>
<head>
<style>
.mixed-container {
  display: block;
}
.mixed-container .horizontal-container {
  display: flex;
}
.mixed-container div {
  background-color: lightcoral;
  margin: 10px;
  padding: 20px;
}
</style>
</head>
<body>

<div class="mixed-container">
  <div class="horizontal-container">
    <div>Div 1</div>
    <div>Div 2</div>
  </div>
  <div>Div 3</div>
</div>

</body>
</html>
These examples should help you control the layout of your div elements. Let me know if you need any further assistance!