(function () {
    'use strict';

    // heatmapCHART:
    // - handle & time categorical data
    // - need to sort out rollovers
    // - need to sort out markers
    function heatmapChart(args) {
        this.args = args;

        this.init = function (args) {
            this.args = args;

            //todo: handle 3D array
            raw_data_transformation(args);
            //process_categorical_variables(args);
            init(args);
            process_heatmap(args);

            //todo: check if any of the axes is categorical
            //                x_axis_categorical(args);
            x_axis(args);
            y_axis(args);

            this.mainPlot();
            //this.markers();
            this.rollover();
            this.windowListeners();

            return this;
        };

        this.mainPlot = function () {
            var svg = mg_get_svg_child_of(args.target);
            var data = args.data[0];
            var heatmapplot = svg.select('g.mg-heatmapplot');
            var fresh_render = heatmapplot.empty();

            var heatmap_boxes;

            // draw the plot on first render
            if (fresh_render) {
                heatmapplot = svg.append('g')
                    .classed('mg-heatmapplot', true);
            }

            heatmap_boxes = heatmapplot.selectAll('.mg-heatmap')
                .data(data);

            heatmap_boxes.exit().remove();

            heatmap_boxes.enter().append('rect')
                .classed('mg-heatmap', true);

            // move the heatmapplot after the axes so it doesn't overlap
            svg.select('.mg-y-axis').node().parentNode.appendChild(heatmapplot.node());
            data.forEach(function(d) {
               console.log(d.x.toFixed(0), d.y.toFixed(0),
                   args.scales.X(d.x).toFixed(2),
                   args.scales.Y(d.y + d.dy).toFixed(2),
                   (args.scales.X(d.x + d.dx) - args.scales.X(d.x)).toFixed(2),
                   (args.scales.Y(d.y - d.dy) - args.scales.Y(d.y)).toFixed(2) );
            });
            heatmap_boxes
                .attr('y', function(d) {
                    return args.scales.Y(d.y+ d.dy);
                })
                .attr('x', function (d) {
                    return args.scales.X(d.x);
                })
                .attr('width', function (d){
                    return args.scales.X(d.x+d.dx) - args.scales.X(d.x);
                })
                .attr('height', function (d) {
                    return args.scales.Y(d.y - d.dy) - args.scales.Y(d.y);
                })
                .attr('fill', function (d) {
                    return d3.interpolateRgb("white", "#b6b6fc")(d.z);
                });
                return this;
        };

        this.markers = function () {
            markers(args);
            return this;
        };

        this.rollover = function () {
            var svg = mg_get_svg_child_of(args.target);
            var g;

            //remove the old rollovers if they already exist
            svg.selectAll('.mg-rollover-rect').remove();
            svg.selectAll('.mg-active-datapoint').remove();

            //rollover text
            svg.append('text')
                .attr('class', 'mg-active-datapoint')
                .attr('xml:space', 'preserve')
                .attr('x', args.width - args.right)
                .attr('y', args.top * 0.75)
                .attr('dy', '.35em')
                .attr('text-anchor', 'end');

            g = svg.append('g')
                .attr('class', 'mg-rollover-rect');

            //draw rollover heatmaps
            var heatmap = g.selectAll(".mg-heatmap-rollover")
                .data(args.data[0]).enter()
                .append("rect")
                .attr('class', 'mg-heatmap-rollover');

            heatmap
                .attr('y', function (d) {
                    return args.scales.Y(d.y + d.dy);
                })
                .attr('x', function (d) {
                    return args.scales.X(d.x);
                })
                .attr('width', function (d) {
                    return args.scales.X(d.x + d.dx) - args.scales.X(d.x);
                })
                .attr('height', function (d) {
                    return args.scales.Y(d.y - d.dy) - args.scales.Y(d.y);
                })
                .attr('opacity', 0)
                .on('mouseover', this.rolloverOn(args))
                .on('mouseout', this.rolloverOff(args))
                .on('mousemove', this.rolloverMove(args));

            return this;
        };

        this.rolloverOn = function (args) {
            var svg = mg_get_svg_child_of(args.target);
            var label_accessor = this.is_vertical ? args.x_accessor : args.y_accessor;
            var data_accessor = this.is_vertical ? args.y_accessor : args.x_accessor;
            var label_units = this.is_vertical ? args.yax_units : args.xax_units;

            return function (d, i) {
                svg.selectAll('text')
                    .filter(function (g, j) {
                        return d === g;
                    })
                    .attr('opacity', 0.3);

                var fmt = MG.time_format(args.utc_time, '%b %e, %Y');
                var num = format_rollover_number(args);

                //highlight active heatmap
                svg.selectAll('g.mg-heatmapplot .mg-heatmap')
                    .filter(function (d, j) {
                        return j === i;
                    })
                    .classed('active', true);

                //update rollover text
                if (args.show_rollover_text) {
                    svg.select('.mg-active-datapoint')
                        .text(function () {
                            if (args.time_series) {
                                var dd = new Date(+d[data_accessor]);
                                dd.setDate(dd.getDate());

                                return fmt(dd) + '  ' + label_units + num(d[label_accessor]);
                            } else {
                                return d[label_accessor] + ': ' + num(d[data_accessor]);
                            }
                        });
                }

                if (args.mouseover) {
                    args.mouseover(d, i);
                }
            };
        };

        this.rolloverOff = function (args) {
            var svg = mg_get_svg_child_of(args.target);

            return function (d, i) {
                //reset active heatmap
                svg.selectAll('g.mg-heatmapplot .mg-heatmap')
                    .classed('active', false);

                //reset active data point text
                svg.select('.mg-active-datapoint')
                    .text('');

                if (args.mouseout) {
                    args.mouseout(d, i);
                }
            };
        };

        this.rolloverMove = function (args) {
            return function (d, i) {
                if (args.mousemove) {
                    args.mousemove(d, i);
                }
            };
        };

        this.windowListeners = function () {
            mg_window_listeners(this.args);
            return this;
        };

        this.init(args);
    }

    var defaults = {
        y_accessor: 'factor',
        x_accessor: 'value',
        baseline_accessor: null,
        predictor_accessor: null,
        predictor_proportion: 5,
        dodge_accessor: null,
        binned: true,
        padding_percentage: 0,
        outer_padding_percentage: 0.1,
        height: 500,
        heatmap_height: 20,
        top: 45,
        left: 70,
        truncate_x_labels: true,
        truncate_y_labels: true,
        rotate_x_labels: 0,
        rotate_y_labels: 0
    };

    MG.register('heatmap', heatmapChart, defaults);

}).call(this);
