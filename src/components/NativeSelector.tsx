// import * as React from 'react';
// import Box from '@mui/material/Box';
// import InputLabel from '@mui/material/InputLabel';
// import FormControl from '@mui/material/FormControl';
// import NativeSelect from '@mui/material/NativeSelect';
// // import "../i18n";
// import { useTranslation } from "react-i18next";

// interface NativeSelectorProps {
//   title:string;
//   value: number;
//   onChange: (value: number) => void;
// }


// const NativeSelector: React.FC<NativeSelectorProps> = ({title, value, onChange }) => {
//   const { t, i18n } = useTranslation(); //for language i18n
//   return (
//     <Box sx={{ minWidth: 120 }}>
//       <FormControl fullWidth>
//         <InputLabel variant="standard" htmlFor="uncontrolled-native">
//           {title}
//         </InputLabel>
//         <NativeSelect
//           value={value}
//           onChange={(event) => onChange(Number(event.target.value))}
//           inputProps={{
//             name: 'timeRange',
//             id: 'uncontrolled-native',
//           }}
//         >
//           <option value={1}>{t("1 day")}</option>
//           <option value={3}>{t("3 days")}</option>
//           <option value={7}>{t("7 days")}</option>
//           <option value={9999}>{t("All")}</option>
//         </NativeSelect>
//       </FormControl>
//     </Box>
//   );
// };

// export default NativeSelector;
import * as React from 'react';
import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { useTranslation } from "react-i18next";

interface NativeSelectorProps {
  title: string;
  value: number;
  onChange: (value: number) => void;
}

const NativeSelector: React.FC<NativeSelectorProps> = ({ title, value, onChange }) => {
  const { t } = useTranslation(); // for language i18n
  const titleWidth = (title.length * 8) + 20; // 8px per character + some extra padding (20px)

  return (
    <Box sx={{ minWidth: 120 }}>
      <FormControl fullWidth sx={{ width: `${titleWidth}px`, position: 'relative' }}>
        <InputLabel
          variant="standard"
          htmlFor="custom-select"
          sx={{
            position: 'absolute',
            top: -8, // Adjust the top position of the label to align better
            left: 15,
            transform: 'none', // Remove the transform to stop the label from floating
            fontSize:11,
          }}
        >
          {title}
        </InputLabel>
        <Select
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          label={title}
          inputProps={{
            name: 'timeRange',
            id: 'custom-select',
          }}
          sx={{
            paddingTop: 0, // Reduce padding-top to reduce height
            paddingBottom: 0, // Reduce padding-bottom to reduce height
            height: 40, // Set a fixed height if necessary
            fontSize: 16, // Adjust the font size to be smaller if needed
            lineHeight: '1.8', // Adjust line height to make it more compact
          }}
        >
          <MenuItem value={1}>{t("1 day")}</MenuItem>
          <MenuItem value={3}>{t("3 days")}</MenuItem>
          <MenuItem value={7}>{t("7 days")}</MenuItem>
          <MenuItem value={9999}>{t("All")}</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};

export default NativeSelector;

