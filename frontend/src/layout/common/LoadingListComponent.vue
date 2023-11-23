<template>
    <div class="audio-item">
        <div>
            <div class="layout-box">
                <p
                    class="audio-title"
                    style="text-align:center;">
                    <svg
                        width="50"
                        height="50"
                        viewBox="0 0 50 50">
                        <defs>
                            <filter
                                id="innerShadow"
                                x="-50%"
                                y="-50%"
                                width="200%"
                                height="200%">
                                <feComponentTransfer in="SourceAlpha">
                                    <feFuncA
                                        type="table"
                                        tableValues="1 0" />
                                </feComponentTransfer>
                                <feGaussianBlur stdDeviation="3" />
                                <feOffset
                                    dx="2"
                                    dy="2"
                                    result="offsetblur" />
                                <feFlood
                                    flood-color="black"
                                    result="color" />
                                <feComposite
                                    in2="offsetblur"
                                    operator="in" />
                                <feComposite
                                    in2="SourceAlpha"
                                    operator="in" />
                                <feMerge>
                                    <feMergeNode in="SourceGraphic" />
                                    <feMergeNode />
                                </feMerge>
                            </filter>
                        </defs>
                        <circle
                            cx="25"
                            cy="25"
                            r="20"
                            stroke="grey"
                            stroke-width="4"
                            fill="none"
                            filter="url(#innerShadow)" />
                        <circle
                            cx="25"
                            cy="25"
                            r="20"
                            stroke="black"
                            stroke-width="4"
                            stroke-dasharray="31.4159265359 94.2477796077"
                            stroke-dashoffset="0"
                            fill="none">
                            <animateTransform
                                attributeName="transform"
                                type="rotate"
                                from="0 25 25"
                                to="360 25 25"
                                dur="1s"
                                repeatCount="indefinite" />
                        </circle>
                    </svg>
                </p>
            </div>
        </div>
    </div>
</template>
<script>
export default {
  name:'LoadingListComponent'
};
</script>