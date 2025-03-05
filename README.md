# Brachistochrone Interstellar and Solar System Calculators

## Scripts

`InterstellarRocketCalculator.jsx` - Interstellar Relativistic Rocket Calculator derived from https://github.com/nathangeffen/space-travel

***

`BrachistochroneCalculator.py`
`BrachistochroneCalculator.jsx`

Python version saves a csv and markdown file with the results of the brachistochrone trajectories at 1/3g (example below.) The .jsx is a React component version. Hosted on https://overvieweffekt.com/.

***

`EpsteinDriveCalculator.py`
`EpsteinDriveCalculator.jsx`

Are scripts that attempt to estimate the interstellar travel times using a relativistic brachistochrone equation for the Nauvoo from the Expanse. that are completly broken

## Using with Astro

### Installation

```bash
npm install interstellar-brachistochrone-calculators
```

### Usage in Astro

Create a new `.astro` file and import the component:

```astro
---
import { BrachistochroneCalc } from 'interstellar-brachistochrone-calculators';
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Brachistochrone Calculator</title>
  </head>
  <body>
    <div class="container mx-auto p-4">
      <h1 class="text-2xl font-bold mb-4">Brachistochrone Calculator</h1>
      <BrachistochroneCalc client:load />
    </div>
  </body>
</html>
```

### Tailwind CSS Integration

This component uses Tailwind CSS classes. Make sure you have Tailwind CSS configured in your Astro project. If not, follow the [official Astro Tailwind integration guide](https://docs.astro.build/en/guides/integrations-guide/tailwind/).

```bash
npx astro add tailwind
```
