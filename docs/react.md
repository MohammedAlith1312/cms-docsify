---
title: React Basics
slug: /react
content: |-
  ## Learn React

  *   React is a JavaScript library for building user interfaces and functions.
      
  *   React is used to build single-page applications.
      
  *   React allows us to create reusable UI components for perfect website.
      
      ```
      import { createRoot } from 'react-dom/client';
      
      function Hello() {
        return (
          <h1>Hello World! mohammed</h1>
        );
      }
      
      createRoot(document.getElementById('root')).render(
        <Hello />
      );
      ```
---
