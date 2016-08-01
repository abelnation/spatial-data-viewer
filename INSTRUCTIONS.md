
Input files:

e.g.: `inputp3d204_1633.txt` 

It has header information, then a list of parameters. 

Each parameter:

- starts with `***`
- then the name of the parameter
- the size of the subsequent matrix (213197 rows and 1 column for example)
- a list of the numbers. 

Elements are in elmx, elmy, and elmz.  All elements have the same half-height, which is given as
`rectza` (equal to 3.22581) in the header info. 

The half-length is in `elma`
The element orientation (counterclockwise from the positive x-axis direction) is in anglemat. 

The simulations involve preexisting fractures that exist during the entire simulation and also
hydraulic fracture elements that may or may not form (so they do not exist at the start of the
simulation, but they are premeshed for convenience). They are labeled in "bc", where 0 is an element
that always exists and 2 is an element that may or may not form and does not exist at the start.

Simulation data files:

e.g.: 
- `204_1633_18542_euler_res_fullpermtrack`
- `204_1633_18542_euler_res_fullprestrack` 

show the fracture conductivity and pressure in the elements at different points in time. They are a
series of records.  Each starts with `***`. Then a line with the number of seconds of simulation time
elapsed until this record, and then a list of the parameter value in each element at that point in
time. The elements that do not exist are given conductivity of 1e-20. An element that exists has a
conductivity that is higher than that (but still quite small). 

This simulation with `1633` is a small toy problem - a single fracture that propagates for a brief
period of time. I also put in simulation files with the names `161_18542` and `161_18552`. They are in a
much larger more complex fracture network. They are two of the simulation in this attached paper. 

The format of these files is obviously not the most efficient possible - it would be much faster to
use binary files. But I opted for ASCII here for convenience. 

Finally, in the dropbox folder, I placed movies I made in ParaView of the three simulations. I have
a separate code that takes the output from these files and turns them into the vtk format, which is
read by ParaView. Paraview is OK, and my current plan is to ask users to use it for their
visualization. In some ways, it is more general than I need, and in other ways it isn't quite what
I'd like and it's a bit harder to use than would be ideal. Ideally, it would automatically generate
a movie showing multiple different streams simultaneously- like several plots showing the pressure,
aperture, etc., at least one from the top and another from the side, another showing a plot of
injection rate/pressure versus time, another showing what's happening in the well, etc. And then
have controls that are more specific to my purpose. So rather than click through several buttons
that are small and not obviously placed on the screen to even get a plot up, the user would have
fewer buttons to press, they'd be easier to see and understand what they do, and they would be able
to basically use it without getting frustrated or "having to think".

Cheers,
Mark
