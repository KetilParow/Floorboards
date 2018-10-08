var settings = {};
var incr = 0.0;

this.onmessage = function (message) {

    message.data.settings.maxLFirstBoard = message.data.settings.boardL;
    var remainder = (message.data.settings.floorW / message.data.settings.boardL - Math.trunc(message.data.settings.floorW / message.data.settings.boardL)) * message.data.settings.boardL;

    //if (remainder < settings.minBoardL)
    message.data.settings.maxLFirstBoard = Math.round(Math.min(remainder, message.data.settings.boardL - (message.data.settings.minBoardL -  remainder)));

    if (message.data.numSteps) {

        runIncrements(message);
    }
    else if (message.data.startLength){

    }
    
}

function runIncrements(message) {
    settings = message.data.settings;
    incr = Math.trunc(((settings.maxLFirstBoard - settings.minBoardL) / (message.data.numSteps * 10)) + 0.5) * 10;
    var alternatives = [];
    self.postMessage("Starting");
    for (var l = settings.minBoardL; l < settings.maxLFirstBoard; l += incr) {

        if (l + incr > settings.maxLFirstBoard)
            l = settings.maxLFirstBoard;

        var logic = new FloorLogic();
        if (l < settings.maxLFirstBoard) {
            logic.CutThisBoard(logic.AddNewBoard(), l, logic.FemaleBoards);
        }

        logic.ResolveFloor();
        var allRemaining = new BoardRow(0, logic.Wasted);
        alternative = { startLength: l };
        //alternatives.push(alternative)

        self.postMessage({ floorResult: {startLength: l, waste: logic.Wasted, wasteLength: allRemaining.Boards.length, wasteTotalLength: allRemaining.Length()}});
        //for (var i = 0; i < allRemaining.Boards.length; i++) {
        //    console.debug(allRemaining.Boards[i].Length + "mm");
        //}
        //break;
    }
    self.postMessage("finished");
}

function Board(length) {
    this.Length = length || settings.boardL;
}
// function Boards() {
//     this.Boards = [];
// }
function BoardRow(width, boards) {
    this.Boards = [];
    this.Width = width || settings.boardW;

    if (boards) {
        for (var i = 0; i < boards.length; i++) {
            this.Boards.push(boards[i]);
        }
    }
    this.Copy = function () {
        var ret = new BoardRow();
        this.Boards.forEach(function (e) { ret.AddBoard(e); });
        ret.Width = this.Width;
        return ret;
    }
    this.AddBoard = function (board) {
        //console.debug("Placing board " + (this.Boards.length + 1) + " (" + board.Length + "mm)" )
        this.Boards.push(board);
        self.postMessage({ boardNo: this.Boards.length - 1, length: board.Length });
    };
    this.Length = function () {
        var ret = 0;
        this.Boards.forEach(function (e) {
            ret += e.Length;
        });
        return ret;
    }
    this.RowIsDone = function () {
        return this.RemainingLength() <= 0;
    }
    this.RemainingLength = function () {
        return Math.max(settings.floorW - this.Length(), 0);
    }
    this.NeedsLength = function () {
        return Math.min(this.RemainingLength(), settings.boardL);
    }
    this.NeedsMaleBoard = function () {
        return this.RemainingLength() > settings.boardL;
    }
    this.NeedsWholeBoard = function () {
        return this.Boards.length > 0 && this.NeedsMaleBoard();
    }
    this.NeedsFemaleBoard = function () {
        return this.Boards.length > 0;
    }
    this.NeedsFirstBoard = function () {
        return this.Boards.length === 0;
    }
    this.NeedsLastBoard = function () {
        return this.Boards.length > 0 && this.RemainingLength() <= settings.boardL;
    }
}
function Floor() {
    this.BoardRows = [];

    this.AddBoardRow = function () {
        this.BoardRows.push(new BoardRow);
        self.postMessage({ rowNo: this.BoardRows.length - 1 });
        //console.debug("Laying row " + this.BoardRows.length);
    }

    this.AddBoardRow();

    this.Copy = function () {
        var ret = new Floor();
        this.BoardRows.forEach(function (e) { ret.BoardRows.push(e.Copy()) });
        return ret;
    };
    this.CurrentRow = function () {
        return this.BoardRows[this.BoardRows.length - 1]
    }
    this.PrevRow = function () {
        return this.BoardRows.length > 1 ? this.BoardRows[this.BoardRows.length - 2] : null;
    }
    this.Depth = function () {
        var ret = 0;
        this.BoardRows.forEach(function (e) {
            ret += e.Width;
        });
        return ret;
    }
    this.IsFinished = function () {
        return this.Depth() >= settings.floorD && this.CurrentRow().RowIsDone();
    };
    this.NeedsMaleBoard = function () {
        if (this.IsFinished())
            return false;
        return this.CurrentRow().NeedsMaleBoard();
    }
    this.NeedsFemaleBoard = function () {
        if (this.IsFinished())
            return false;
        return this.CurrentRow().NeedsFemaleBoard();
    }
    this.NeedsWholeBoard = function () {
        if (this.IsFinished())
            return false;
        return this.CurrentRow().NeedsWholeBoard();
    }
    this.NeedsFirstBoard = function () {
        if (this.IsFinished())
            return false;
        return this.CurrentRow().NeedsFirstBoard();
    }
    this.NeedsLastBoard = function () {
        if (this.IsFinished())
            return false;
        return this.CurrentRow().NeedsLastBoard();
    }
    this.BoardFits = function (b) {
        if (this.IsFinished())
            return false;
        if (this.CurrentRow().NeedsWholeBoard() && b.Length < settings.boardL)
            return false;
        //if (this.CurrentRow().NeedsFirstBoard() && b.Length > settings.maxLFirstBoard)
        //    return false;
        if (!this.CurrentRow().NeedsFirstBoard() && b.Length < this.CurrentRow().NeedsLength())
            return false;
        return true;
    }
    this.AddBoard = function (board) {
        if (this.PrevRow() && this.CurrentRow().Boards.length == 0 && this.PrevRow().Boards[0].Length == board.Length) {
            debugger;
        }
        //if (board.Length < settings.minBoardL)
        //    debugger;
        this.CurrentRow().AddBoard(board);
        if (this.CurrentRow().RowIsDone() && !this.IsFinished()) {
            this.AddBoardRow();
        }
    }
}

function FloorLogic() {
    this.Floor = new Floor();
    this.MaleBoards = []; //new Boards();
    this.FemaleBoards = []; //new Boards();
    this.Wasted = []; //new Boards();
    this.CopyCurrent = function () {
        var ret = new FloorLogic();
        ret.Floor = this.Floor.Copy();
        this.MaleBoards.forEach(function (e) { ret.MaleBoards.push(e); });
        this.FemaleBoards.forEach(function (e) { ret.femaleBoards.push(e); });
        this.Wasted.forEach(function (e) { ret.Wasted.push(e); });
        return ret;
    };

    this.NextBoardCandidates = function () {
        if (this.Floor.IsFinished())
            return null;
        var ret = [];

        if (this.Floor.NeedsWholeBoard()) {
            ret = [this.MaleBoards.find(function (e) { if (e.Length === settings.boardL) return e; return undefined; })];
        }
        else if (this.Floor.NeedsMaleBoard()) {
            this.MaleBoards.forEach(function (e) {
                ret.push(e);
            });
        }
        else if (this.Floor.NeedsFemaleBoard()) {
            this.FemaleBoards.forEach(function (e) {
                if (ret.indexOf(e) == -1) {
                    ret.push(e);
                }
            });
        }
        return ret;
    }

    this.CompleteBoardExists = function () {
        var exists = false;
        this.MaleBoards.forEach(function (e) {
            if (e.Length === settings.boardL) {
                exists = true;
                return false;
            }
        });
        return exists;
    }

    this.FindAndPlaceNextBoard = function () {
        if (!this.CompleteBoardExists()) {
            this.AddNewBoard();
        }
        var candidates = [];
        var floor = this.Floor;
        var solver = this;
        this.NextBoardCandidates().forEach(function (board) {
            if (floor.NeedsFemaleBoard() && solver.FemaleBoards.indexOf(board) == -1)
                return true;
            if (floor.NeedsMaleBoard() && solver.MaleBoards.indexOf(board) == -1)
                return true;
            if (floor.BoardFits(board)) {
                candidates.push(board);
            }
        });

        this.PickAndPlaceCandidate(candidates);
    }

    this.LayBoard = function (board) {
        this.Floor.AddBoard(board);
        if (this.FemaleBoards.indexOf(board) > -1) {
            this.FemaleBoards.splice(this.FemaleBoards.indexOf(board), 1);
        }
        if (this.MaleBoards.indexOf(board) > -1) {
            this.MaleBoards.splice(this.MaleBoards.indexOf(board), 1);
        }
    }

    this.CutThisBoard = function (board, newLength, typeOfNewBoard) {
        var newBoard = new Board(board.Length - newLength);
        board.Length = newLength;
        if (typeOfNewBoard != null && newBoard.Length >= settings.minBoardL) {
            typeOfNewBoard.push(newBoard);
        }
        else {
            this.Wasted.push(newBoard);
        }
    }

    this.PickAndPlaceCandidate = function (candidates) {
        var floor = this.Floor;
        var solver = this;
        var board = null;
        
        if (floor.CurrentRow().NeedsWholeBoard()) {
            board = candidates.find(function (b) { if (b.Length === settings.boardL) return b; return undefined; });
        }
        else if (floor.CurrentRow().NeedsFirstBoard()) {
            candidates = candidates.filter(function (b) { return MatchesPreviousRowsFirstBoard(b) }).sort(function (a, b) { return a.Length > b.Length ? 1 : a.Length == b.Length ? 0 : -1; });
            board = candidates[0];
            var lBoard = board.Length;
            if (lBoard > settings.maxLFirstBoard) {
                //Must cut, or we end up with a tiny piece at end of row
                lBoard = settings.maxLFirstBoard;
            }
            if (floor.PrevRow() != null && Math.abs(lBoard - floor.PrevRow().Boards[0].Length) < settings.minBoardL) {
                //Must cut, or we end up with joint right next to joint in previous row
                lBoard = floor.PrevRow().Boards[0].Length - settings.minBoardL;
            }
            if (lBoard < board.Length) {
                solver.CutThisBoard(board, lBoard, board.Length == settings.boardL ? solver.FemaleBoards : null);
            }

        }
        else if (floor.CurrentRow().NeedsLastBoard()) {
            candidates = candidates.filter(function (b) { return b.Length >= floor.CurrentRow().NeedsLength() }).sort(function (a, b) { return a.Length > b.Length ? 1 : a.Length == b.Length ? 0 : -1; });
            board = candidates[0];
            if (board.Length > floor.CurrentRow().NeedsLength()) {
                //Split board:
                solver.CutThisBoard(board, floor.CurrentRow().NeedsLength(), solver.MaleBoards);
            }
        }
        
        solver.LayBoard(board);

        function MatchesPreviousRowsFirstBoard(board) {
            if (floor.PrevRow() == null)
                return true;
            if (floor.PrevRow().Boards[0].Length < 2 * settings.minBoardL && board.Length < 2 * settings.minBoardL) {
                return false;
            }
            return true;
        }
    }

    this.ResolveFloor = function () {
        var solver = this;
        while (!this.Floor.IsFinished()) {
            var nextBoards = this.FindAndPlaceNextBoard();
            //if (this.Floor.BoardRows.length > 1)
            //    break;
        }
        this.FemaleBoards.forEach(function (b) { solver.Wasted.push(b); });
        this.MaleBoards.forEach(function (b) { solver.Wasted.push(b); });
    }

    this.AddNewBoard = function () {
        var b = new Board();
        this.MaleBoards.push(b);
        this.FemaleBoards.push(b);
        return b;
    }
}
