import { useContext } from "react";
import { IoWifiSharp } from "react-icons/io5";
import { Link } from "react-router-dom";
import ThemeContext from "../context/ThemeContext";

export default function MainPannelLeft() {
  const { onDragStartItem } = useContext(ThemeContext);
  const items = [
    {
      sensor: false,
      active: true,
      img: "/images/cabinet.png",
      url: "/",
      name: "Traffic Cabinet",
    },
    {
      sensor: false,
      active: true,
      img: "/images/Connets.png",
      url: "/",
      name: "Flex4P Gateway",
      orderCode: "FLEX-CTRL-4P",
    },

    {
      active: true,
      img: "/images/Connets (3).png",
      url: "/",
      name: "SPP Radio",
      sensor: false,
      types: [
        { name: "SPP", orderCode: "APCC-SPP" },
        { name: "eSPP", orderCode: "APCC-ESPP" },
      ],
    },
    {
      active: true,
      img: "/images/Connets (4).png",
      url: "/",
      name: "Repeater",
      sensor: false,
      types: [
        { name: "Long Life Repeater", orderCode: "RPT3-LL" },
        {
          name: "Long Life Repeater with external Antenna",
          orderCode: "FLEX-RPT3-LL",
        },
        { name: "Solar Powered Repeater", orderCode: "FLEX-RPT3-SLR-E" },
      ],
    },

    {
      sensor: false,
      active: true,
      img: "/images/flex-card.png",
      url: "/",
      name: "EX Card",
      orderCode: "EX240",
    },
    {
      sensor: false,
      active: true,
      img: "/images/flex-connect.png",
      url: "/",
      name: "FlexConnect",
      orderCode: "CC240",
    },

    {
      active: true,
      sensor: true,
      name: "Camera Zone",
      img: "/images/Connets (7).png",
      url: "/",
      types: [
        {
          name: "Axis 9mm",
          orderCode: "P1455-LE-9",
        },
        {
          name: "Axis 29mm",
          orderCode: "P1455-LE-29",
        },
      ],
    },
    {
      active: true,
      sensor: true,
      name: "Magnetometer Zone",
      img: "/images/Connets (8).png",
      url: "/",
      types: [
        {
          name: "MAG2 - Flush + Shell",
          orderCode: "VSN240-F-2",
        },
        {
          name: "MAG2 - Flush, no Shell",
          orderCode: "VSN240-F-2A",
        },
        {
          name: "MAG2 - Flush, Signals",
          orderCode: "VSN240-T-2",
        },
        {
          name: "MAG2 - Signals, No Shell",
          orderCode: "VSN240-T-2A)",
        },
        {
          name: "MAG3",
          orderCode: "VSN240-F-3",
        },
        {
          name: "MAG3 - signals",
          orderCode: "VSN240-T-3",
        },
        {
          name: "MAG3 - EzOUT",
          orderCode: "VSN240-F3-C",
        },
        {
          name: "MAG3 - EzOut signals",
          orderCode: "VSN240-T3-C)",
        },
      ],
    },
    {
      active: true,
      sensor: true,
      name: "uRadar Zone",
      img: "/images/Connets (9).png",
      url: "/",
      orderCode: "VSN240-M-2",
    },
  ];

  return (
    <ul className="main-pannel-left">
      {items?.map((item, i) => (
        <li key={i}>
          <Link
            title={item?.name}
            to={item?.url}
            draggable
            sensor={item?.sensor}
            onDragStart={() => onDragStartItem(item)}
          >
            <img src={item?.img} alt="" />
            {item?.active && (
              <span>
                <IoWifiSharp />
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
