pragma solidity ^0.4.15;

import "../contracts/ERC721.sol";

contract TestERC721 is ERC721 {

    mapping (address => uint) balances;
    mapping (uint => address) owners;
    mapping (uint => mapping (address => address)) allowed;

    uint _totalSupply;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);

    function implementsERC721() public constant returns (bool) {
      return true;
    }
    function TestERC721() public {
      _totalSupply = 1000000;
    } 

    function totalSupply() public constant returns (uint) {
        return _totalSupply;
    }
    function balanceOf(address _owner) public constant returns (uint256 balance) {
      return balances[_owner];
    }

    function ownerOf(uint _tokenId) public constant returns (address owner) {
      return owners[_tokenId];
    }

    function approve(address _to, uint256 _tokenId) public {
      allowed[_tokenId][msg.sender] = _to;
      Approval(msg.sender, _to, _tokenId);
    }

    function transferFrom(address _from, address _to, uint256 _tokenId) public {
      require(owners[_tokenId] == _from && allowed[_tokenId][_from] == msg.sender);
      owners[_tokenId] = _to;
      balances[_to]++;
      balances[_from]--;
      Transfer(_from, _to, _tokenId);
    }
    function transfer(address _to, uint256 _tokenId) public {
      require (owners[_tokenId] == msg.sender && balances[msg.sender] > 0); 
      owners[_tokenId] = _to;
      balances[_to]++;
      balances[msg.sender]--;
      Transfer(msg.sender, _to, _tokenId);
    }

}