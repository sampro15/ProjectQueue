import React from 'react';
import { Typography, Button, Dialog, DialogTitle, DialogActions, DialogContent } from "@mui/material";
// import "../i18n";
import { useTranslation } from "react-i18next";

// Define the props interface for your DialogPopup component
interface DialogPopupProps {
  title: string;
  content: string;
  open: boolean;       
  onCancel: () => void;
  onOk: () => void;
}

const { t, i18n } = useTranslation(); //for language i18n

const DialogPopup: React.FC<DialogPopupProps> = ({ title, content, open, onCancel, onOk }) => {
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography>{content}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="primary" >
        {t("Cancel")}
        </Button>
        <Button onClick={onOk} color="error" variant="contained">
        {t("Yes")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DialogPopup;
